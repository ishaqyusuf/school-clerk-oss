import {
	accountActionCard,
	accountActionSubmission,
	moneyDraftToolNames,
} from "@school-clerk/ai/contracts";
import { completeAssistantMutation, Prisma } from "@school-clerk/db";
import {
	hasAssistantConversationAccess,
	jsonValue,
} from "@school-clerk/db/assistant";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createFinanceChargeInTransaction,
	recordFinancePaymentInTransaction,
	requireFinanceReadAccess,
	transferFinanceFundsInTransaction,
} from "../db/queries/finance";
import { recordStudentPaymentReceivedActivity } from "../db/queries/finance-activity";
import type { TRPCContext } from "../trpc/init";
import { resolveAssistantActor } from "./actor";

export const accountActionDecision = z
	.object({
		draftId: z.string().min(1).max(191),
		selection: accountActionSubmission,
	})
	.strict();

export async function salaryOptions(ctx: TRPCContext, staffId: string) {
	const actor = await resolveAssistantActor(ctx);
	if (!actor.availableTools.includes("prepareStaffSalary"))
		throw new TRPCError({ code: "FORBIDDEN" });
	requireFinanceReadAccess(ctx);
	const charges = await ctx.db.financeCharge.findMany({
		where: {
			schoolProfileId: actor.schoolId,
			staffProfileId: staffId,
			payerType: "STAFF",
			deletedAt: null,
			status: { in: ["PENDING", "PARTIALLY_PAID", "DRAFT"] },
		},
		select: {
			id: true,
			title: true,
			amount: true,
			amountPaid: true,
			stream: { select: { name: true } },
		},
		orderBy: [{ createdAt: "desc" }, { id: "asc" }],
		take: 30,
	});
	return charges.flatMap((charge) => {
		const outstanding = charge.amount.minus(charge.amountPaid ?? 0).toNumber();
		return outstanding > 0
			? [
					{
						id: charge.id,
						title: charge.title,
						account: charge.stream.name,
						outstanding,
					},
				]
			: [];
	});
}

export async function accountOptions(
	ctx: TRPCContext,
	action: "staff_payment" | "transfer",
) {
	const actor = await resolveAssistantActor(ctx);
	if (!actor.availableTools.includes(moneyDraftToolNames[action]))
		throw new TRPCError({ code: "FORBIDDEN" });
	requireFinanceReadAccess(ctx);
	return ctx.db.financeStream.findMany({
		where: {
			schoolProfileId: actor.schoolId,
			deletedAt: null,
			...(action === "staff_payment" ? { accountType: "DEBIT" as const } : {}),
		},
		select: { id: true, name: true },
		orderBy: [{ name: "asc" }, { id: "asc" }],
		take: 100,
	});
}

const cents = (amount: number) => Math.round(amount * 100);

export async function completeAccountAction(
	ctx: TRPCContext,
	input: z.infer<typeof accountActionDecision>,
) {
	const actor = await resolveAssistantActor(ctx);
	const toolName = moneyDraftToolNames[input.selection.action];
	if (!actor.availableTools.includes(toolName))
		throw new TRPCError({ code: "FORBIDDEN" });
	const owned = {
		id: input.draftId,
		schoolProfileId: actor.schoolId,
		userId: actor.userId,
		toolName,
	};
	const draft = await ctx.db.assistantActionProposal.findFirst({
		where: owned,
		select: { conversationId: true },
	});
	if (
		!draft ||
		!(await hasAssistantConversationAccess(ctx.db, actor, draft.conversationId))
	)
		throw new TRPCError({ code: "NOT_FOUND" });

	const selection = input.selection;
	return ctx.db.$transaction(
		async (tx) => {
			await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "AssistantActionProposal"
			WHERE "id" = ${owned.id} AND "schoolProfileId" = ${owned.schoolProfileId}
				AND "userId" = ${owned.userId} FOR UPDATE`);
			const proposal = await tx.assistantActionProposal.findFirstOrThrow({
				where: owned,
			});
			const fresh = await resolveAssistantActor(ctx, false, tx);
			if (
				fresh.schoolId !== actor.schoolId ||
				fresh.userId !== actor.userId ||
				!fresh.availableTools.includes(toolName)
			)
				throw new TRPCError({ code: "FORBIDDEN" });
			if (proposal.status === "completed") return proposal.result;
			if (
				proposal.status !== "pending" ||
				proposal.expiresAt <= new Date() ||
				proposal.sessionId !== fresh.sessionId ||
				proposal.termId !== fresh.termId ||
				!fresh.sessionId ||
				!fresh.termId
			)
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"The draft expired or belongs to another academic workspace.",
				});

			const card = accountActionCard.parse(proposal.payload);
			let result: {
				message: string;
				amount: number;
				paymentIds?: string[];
				transferId?: string;
			};
			if (selection.action === "transfer") {
				if (card.action !== selection.action)
					throw new TRPCError({ code: "BAD_REQUEST" });
				const transfer = await transferFinanceFundsInTransaction(ctx, tx, {
					fromStreamId: selection.fromId,
					toStreamId: selection.toId,
					amount: selection.amount,
					note: selection.note,
				});
				result = {
					message: "Transfer recorded",
					amount: selection.amount,
					transferId: transfer.transferId,
				};
			} else {
				const paymentDetails = {
					method: selection.method ?? "Cash",
					paymentDate: selection.date
						? new Date(`${selection.date}T12:00:00+01:00`)
						: undefined,
					reference: selection.reference,
				};
				if (selection.action === "student_payment") {
					if (card.action !== selection.action)
						throw new TRPCError({ code: "BAD_REQUEST" });
					const ids = selection.lines.map((line) => line.chargeId).sort();
					const paidCents = selection.lines.reduce(
						(total, line) => total + cents(line.amount),
						0,
					);
					if (
						new Set(ids).size !== ids.length ||
						(card.transferTotal !== undefined &&
							cents(card.transferTotal) !== paidCents)
					)
						throw new TRPCError({
							code: "BAD_REQUEST",
							message:
								"Use each fee once and allocate the full transfer amount.",
						});

					// Serialize approvals for the same bank transfer within the tenant.
					if (
						paymentDetails.method === "Bank Transfer" &&
						selection.reference
					) {
						const ref = selection.reference.trim();
						const normalized = ref.replace(/[^a-z0-9]/gi, "").toLowerCase();
						const refKey =
							normalized.length >= 6 ? normalized : ref.toLowerCase();
						await tx.$executeRaw(
							Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`assistant-transfer:${actor.schoolId}:${refKey}`}, 0))`,
						);
						const duplicate = await tx.$queryRaw<
							{ id: string }[]
						>(Prisma.sql`SELECT id FROM "FinancePayment"
						WHERE "schoolProfileId" = ${actor.schoolId} AND "payerType" = 'STUDENT' AND status = 'PAID'
							AND "deletedAt" IS NULL AND method IN ('Bank Transfer', 'TRANSFER', 'BANK_TRANSFER')
							AND (lower(reference) = lower(${ref})
								${normalized.length >= 6 ? Prisma.sql`OR regexp_replace(lower(reference), '[^a-z0-9]', '', 'g') = ${normalized}` : Prisma.empty})
						LIMIT 1`);
						if (duplicate.length)
							throw new TRPCError({
								code: "CONFLICT",
								message: "This bank transfer reference is already recorded.",
							});
					}
					await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "FinanceCharge"
					WHERE "schoolProfileId" = ${actor.schoolId} AND "id" IN (${Prisma.join(ids)})
					ORDER BY "id" FOR UPDATE`);
					const charges = await tx.financeCharge.findMany({
						where: {
							id: { in: ids },
							schoolProfileId: actor.schoolId,
							payerType: "STUDENT",
							deletedAt: null,
							student: { schoolProfileId: actor.schoolId, deletedAt: null },
						},
						select: { id: true, studentId: true },
					});
					const byId = new Map(
						charges.map((charge) => [charge.id, charge.studentId]),
					);
					const paymentIds: string[] = [];
					for (const line of selection.lines) {
						if (byId.get(line.chargeId) !== line.studentId)
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: "A fee does not belong to the selected student.",
							});
						const payment = await recordFinancePaymentInTransaction(ctx, tx, {
							...paymentDetails,
							chargeId: line.chargeId,
							amount: line.amount,
						});
						paymentIds.push(payment.paymentId);
					}
					await recordStudentPaymentReceivedActivity(ctx, tx, paymentIds);
					result = {
						message: "Student payment recorded",
						amount: paidCents / 100,
						paymentIds,
					};
				} else {
					if (card.action !== selection.action)
						throw new TRPCError({ code: "BAD_REQUEST" });
					const staff = await tx.staffProfile.findFirst({
						where: {
							id: selection.staffId,
							schoolProfileId: actor.schoolId,
							deletedAt: null,
						},
						select: { id: true },
					});
					if (!staff)
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Staff member was not found.",
						});
					let chargeId = selection.chargeId;
					if (chargeId) {
						await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "FinanceCharge"
						WHERE "schoolProfileId" = ${actor.schoolId} AND "id" = ${chargeId} FOR UPDATE`);
						const charge = await tx.financeCharge.findFirst({
							where: {
								id: chargeId,
								schoolProfileId: actor.schoolId,
								payerType: "STAFF",
								staffProfileId: staff.id,
								deletedAt: null,
							},
							select: { id: true },
						});
						if (!charge)
							throw new TRPCError({
								code: "NOT_FOUND",
								message: "Salary charge was not found.",
							});
					} else {
						const account =
							selection.streamId &&
							(await tx.financeStream.findFirst({
								where: {
									id: selection.streamId,
									schoolProfileId: actor.schoolId,
									accountType: "DEBIT",
									deletedAt: null,
								},
								select: { id: true },
							}));
						if (!account)
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: "Choose an expense account for this salary.",
							});
						const charge = await createFinanceChargeInTransaction(ctx, tx, {
							payerType: "STAFF",
							type: "SALARY",
							staffProfileId: staff.id,
							amount: selection.amount,
							streamId: account.id,
							title: "Salary",
							termId: fresh.termId,
							sessionId: fresh.sessionId,
						});
						chargeId = charge.id;
					}
					const payment = await recordFinancePaymentInTransaction(ctx, tx, {
						...paymentDetails,
						chargeId,
						amount: selection.amount,
					});
					result = {
						message: "Salary payment recorded",
						amount: selection.amount,
						paymentIds: [payment.paymentId],
					};
				}
			}
			const execution = await tx.assistantToolExecution.create({
				data: {
					schoolProfileId: actor.schoolId,
					conversationId: proposal.conversationId,
					runId: proposal.runId,
					toolName,
					capability: "finance.write",
					isMutation: true,
					input: jsonValue(selection),
				},
				select: { id: true },
			});
			const receipt = await completeAssistantMutation(tx, {
				executionId: execution.id,
				runId: proposal.runId,
				conversationId: proposal.conversationId,
				schoolId: actor.schoolId,
				userId: actor.userId,
				userName: actor.userName,
				toolName,
				title: result.message,
				description: result.message,
				output: result,
			});
			const saved = { ...result, receipt };
			await tx.assistantActionProposal.update({
				where: { id: proposal.id },
				data: {
					status: "completed",
					completedAt: new Date(),
					result: jsonValue(saved),
				},
			});
			return saved;
		},
		{ timeout: 30_000 },
	);
}
