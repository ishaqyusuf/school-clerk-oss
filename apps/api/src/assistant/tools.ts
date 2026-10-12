import { formatStudentName } from "@school-clerk/utils/student-name";
import { classroomDisplayName } from "@school-clerk/utils";
import { assistantToolInfo } from "@school-clerk/ai/contracts";
import {
	Prisma,
	createAssistantConfirmation,
	consumeAssistantConfirmation,
	enrollStudentInAcademicTermTransaction,
	moveStudentTermFormsTransaction,
} from "@school-clerk/db";
import type { DatabaseTransaction } from "@school-clerk/db";
import { jsonValue, requestFingerprint } from "@school-clerk/db/assistant";
import {
	createSchoolAiTools,
	buildSchoolAiConfirmationToken,
	readSchoolAiConfirmationToken,
	schoolAiConfirmationDigest,
	isCapabilityAllowed,
	getSchoolAiToolPolicy,
	type SchoolAiToolContext,
	type SchoolAiToolRuntimeDeps,
} from "@school-clerk/ai";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { TRPCContext } from "../trpc/init";
import { resolveAssistantActor, type AssistantActor } from "./actor";
import { recordFinancePaymentInTransaction } from "../db/queries/finance";
import { getAssistantTeacherWorkspace } from "@school-clerk/db/assistant";

export const mutationTools = new Set([
	"enrollStudent",
	"receiveStudentPayment",
	"createInventoryItem",
	"recordInventoryIssuance",
	"recordAssessmentScores",
	"moveStudentClass",
]);
export async function proposalRevision(
	tx: DatabaseTransaction,
	actor: AssistantActor,
	toolName: string,
	input: Record<string, unknown>,
) {
	const schoolProfileId = actor.schoolId;
	const studentId =
		typeof input.studentId === "string" ? input.studentId : undefined;
	const allocations = Array.isArray(input.allocations)
		? (input.allocations as { studentFeeId: string }[])
		: [];
	if (toolName === "recordAssessmentScores") {
		const subjectId = String(input.resolvedDepartmentSubjectId ?? "");
		const assessments = await tx.classroomSubjectAssessment.findMany({
			where: { departmentSubjectId: subjectId, deletedAt: null },
			orderBy: { id: "asc" },
			select: {
				id: true,
				title: true,
				obtainable: true,
				percentageObtainable: true,
				updatedAt: true,
			},
		});
		const ids = Array.isArray(input.resolvedScores)
			? input.resolvedScores.map((s) =>
					String((s as { studentTermFormId?: string }).studentTermFormId ?? ""),
				)
			: [];
		const scores = await tx.studentAssessmentRecord.findMany({
			where: {
				studentTermFormId: { in: ids },
				classSubjectAssessmentId: { in: assessments.map((a) => a.id) },
			},
			orderBy: { id: "asc" },
			select: { id: true, obtained: true, updatedAt: true },
		});
		return requestFingerprint({ assessments, scores });
	}
	const state =
		toolName === "receiveStudentPayment"
			? await tx.financeCharge.findMany({
					where: {
						schoolProfileId,
						id: { in: allocations.map((a) => a.studentFeeId) },
					},
					orderBy: { id: "asc" },
					select: { id: true, amount: true, amountPaid: true, status: true },
				})
			: toolName === "enrollStudent" || toolName === "moveStudentClass"
				? await tx.studentTermForm.findMany({
						where: {
							schoolProfileId,
							studentId,
							sessionTermId: actor.termId,
							deletedAt: null,
						},
						orderBy: { id: "asc" },
						select: { id: true, classroomDepartmentId: true, updatedAt: true },
					})
				: toolName === "recordInventoryIssuance"
					? await tx.schoolInventory.findFirst({
							where: {
								id: String(input.inventoryId ?? input.itemId ?? ""),
								schoolProfileId,
							},
							select: { id: true, updatedAt: true },
						})
					: { input };
	return requestFingerprint(state);
}
async function proposalPreview(
	ctx: TRPCContext,
	actor: AssistantActor,
	input: Record<string, unknown>,
) {
	const preview = { ...input };
	if (typeof input.studentId === "string") {
		const student = await ctx.db.students.findFirstOrThrow({
			where: {
				id: input.studentId,
				schoolProfileId: actor.schoolId,
				deletedAt: null,
			},
			select: { name: true, surname: true, otherName: true },
		});
		preview.studentName = formatStudentName(
			student,
			ctx.profile.studentNameFormat,
		);
	}
	if (typeof input.studentTermFormId === "string")
		await ctx.db.studentTermForm.findFirstOrThrow({
			where: {
				id: input.studentTermFormId,
				schoolProfileId: actor.schoolId,
				studentId: String(input.studentId ?? ""),
				sessionTermId: actor.termId,
				schoolSessionId: actor.sessionId,
				deletedAt: null,
			},
		});
	if (typeof input.classroomDepartmentId === "string") {
		const classroom = await ctx.db.classRoomDepartment.findFirstOrThrow({
			where: {
				id: input.classroomDepartmentId,
				schoolProfileId: actor.schoolId,
				deletedAt: null,
				classRoom: {
					schoolSessionId: actor.sessionId ?? undefined,
					deletedAt: null,
				},
			},
			select: { departmentName: true, classRoom: { select: { name: true } } },
		});
		preview.classroomName = classroomDisplayName({
			className: classroom.classRoom?.name,
			departmentName: classroom.departmentName,
		});
	}
	if (typeof input.inventoryId === "string") {
		const item = await ctx.db.schoolInventory.findFirstOrThrow({
			where: {
				id: input.inventoryId,
				schoolProfileId: actor.schoolId,
				deletedAt: null,
			},
			select: { title: true, quantity: true },
		});
		preview.itemTitle = item.title;
		preview.availableStock = item.quantity;
	}
	if (Array.isArray(input.allocations))
		preview.allocations = await Promise.all(
			input.allocations.map(async (value) => {
				const allocation = value as Record<string, unknown>;
				const charge = await ctx.db.financeCharge.findFirstOrThrow({
					where: {
						id: String(allocation.studentFeeId),
						schoolProfileId: actor.schoolId,
						studentId: String(input.studentId),
						studentTermFormId: String(input.studentTermFormId),
						deletedAt: null,
					},
					select: { title: true },
				});
				return { ...allocation, feeTitle: charge.title };
			}),
		);
	return preview;
}
function secret() {
	const value = process.env.BETTER_AUTH_SECRET;
	if (!value) throw new Error("Assistant approvals are not configured.");
	return value;
}
export async function buildAssistantTools(
	ctx: TRPCContext,
	actor: AssistantActor,
	runId: string,
	conversationId: string,
	approval?: { id: string; toolName: string; token: string },
) {
	if (!actor.config) throw new Error("Assistant settings unavailable");
	const context: SchoolAiToolContext = {
		...actor,
		config: actor.config,
		runId,
		conversationId,
		proposalId: approval?.id,
		studentNameFormat: ctx.profile.studentNameFormat,
	};
	const assertAccess = async (toolName: string) => {
		const current = await resolveAssistantActor(ctx);
		if (
			current.schoolId !== actor.schoolId ||
			current.userId !== actor.userId ||
			current.sessionId !== actor.sessionId ||
			current.termId !== actor.termId ||
			!current.availableTools.includes(toolName)
		)
			throw new Error(
				"This action is no longer available in the current workspace.",
			);
		const run = await ctx.db.assistantRun.findFirst({
			where: {
				id: runId,
				schoolProfileId: actor.schoolId,
				userId: actor.userId,
				status: "running",
				cancelRequested: false,
				deadlineAt: { gt: new Date() },
			},
		});
		if (!run)
			throw new Error(
				"This response stopped. Check saved actions before retrying.",
			);
	};
	const deps: SchoolAiToolRuntimeDeps = {
		assertToolAccess: ({ toolName }) => assertAccess(toolName),
		isUserConfirmed: (input) =>
			Boolean(
				approval &&
					approval.toolName === input.toolName &&
					approval.token === input.confirmationToken,
			),
		isCapabilityAllowed,
		readConfirmationToken: (token) =>
			readSchoolAiConfirmationToken(token, secret()),
		buildConfirmationToken: async (input) => {
			const preview = await proposalPreview(ctx, actor, input.actionInput);
			const { runId: sourceRunId, ...payload } = input;
			const token = buildSchoolAiConfirmationToken(payload, secret());
			const decoded = readSchoolAiConfirmationToken(token, secret());
			if (!decoded) throw new Error("Approval could not be created");
			await ctx.db.$transaction(async (tx) => {
				await createAssistantConfirmation(tx, {
					...decoded,
					confirmationId: decoded.confirmationId,
					schoolId: decoded.schoolId,
					userId: decoded.userId,
					conversationId: decoded.conversationId,
					runId: sourceRunId,
					tokenDigest: schoolAiConfirmationDigest(token),
					expiresAt: new Date(decoded.expiresAt),
				});
				await tx.assistantActionProposal.create({
					data: {
						schoolProfileId: actor.schoolId,
						userId: actor.userId,
						conversationId,
						runId: sourceRunId,
						toolName: input.toolName,
						payload: jsonValue(input.actionInput),
						summary: proposalSummary(input.toolName, preview),
						token,
						sessionId: actor.sessionId,
						termId: actor.termId,
						expiresAt: new Date(decoded.expiresAt),
						revision: await proposalRevision(
							tx,
							actor,
							input.toolName,
							input.actionInput,
						),
					},
				});
			});
			return token;
		},
		consumeConfirmation: async (transaction, input) => {
			if (!approval) throw new Error("Review and approve this action first.");
			const tx = transaction as DatabaseTransaction;

			await tx.$queryRaw(
				Prisma.sql`SELECT "id" FROM "AssistantActionProposal" WHERE "id"=${approval.id} FOR UPDATE`,
			);
			const fresh = await resolveAssistantActor(ctx, false, tx);
			if (!fresh.availableTools.includes(approval.toolName))
				throw new Error("Permission changed. Request a new review.");
			const active = await tx.assistantRun.findFirst({
				where: {
					id: runId,
					status: "running",
					cancelRequested: false,
					deadlineAt: { gt: new Date() },
				},
			});
			if (!active)
				throw new Error("This response stopped. Check saved actions.");

			const proposal = await tx.assistantActionProposal.findFirst({
				where: {
					id: approval.id,
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
					conversationId,
					status: "pending",
					expiresAt: { gt: new Date() },
				},
			});
			if (
				!proposal ||
				proposal.token !== input.token ||
				proposal.sessionId !== actor.sessionId ||
				proposal.termId !== actor.termId
			)
				throw new Error(
					"Approval expired or was already handled. Check saved actions.",
				);
			if (
				proposal.revision !==
				(await proposalRevision(
					tx,
					actor,
					proposal.toolName,
					proposal.payload as Record<string, unknown>,
				))
			)
				throw new Error(
					"The record changed. Ask for a fresh review before continuing.",
				);
			await consumeAssistantConfirmation(tx, {
				...input.payload,
				confirmationId: input.payload.confirmationId,
				schoolId: input.payload.schoolId,
				userId: input.payload.userId,
				conversationId: input.payload.conversationId,
				runId,
				tokenDigest: schoolAiConfirmationDigest(input.token),
				expiresAt: new Date(input.payload.expiresAt),
			});
			await tx.assistantActionProposal.update({
				where: { id: proposal.id },
				data: { status: "executing" },
			});
		},
		createAssistantToolExecution: (input) =>
			ctx.db.assistantToolExecution.create({
				data: {
					runId: input.runId,
					conversationId: input.conversationId,
					schoolProfileId: input.schoolId,
					toolName: input.toolName,
					capability: input.capability,
					isMutation: input.isMutation,
					input: jsonValue(input.input),
				},
			}),
		finishAssistantToolExecution: (input) =>
			ctx.db.assistantToolExecution.updateMany({
				where: { id: input.toolExecutionId, status: { not: "completed" } },
				data: {
					status: input.status,
					output:
						input.output === undefined ? undefined : jsonValue(input.output),
					error: input.error,
					completedAt: new Date(),
				},
			}),
		recordAssistantActivity: (input) =>
			ctx.db.activity.create({
				data: {
					schoolProfileId: input.schoolId,
					userId: input.userId,
					author: input.userName ?? actor.userName,
					source: "system",
					type: input.type,
					title: input.title,
					description: input.description,
					meta: input.meta ? jsonValue(input.meta) : undefined,
				},
			}),
		getTeacherWorkspaceSummary: async () =>
			actor.termId && actor.sessionId
				? getAssistantTeacherWorkspace({
						schoolId: actor.schoolId,
						termId: actor.termId,
						sessionId: actor.sessionId,
						userEmail: ctx.currentUser?.email ?? "",
						studentNameFormat:
							ctx.profile.studentNameFormat ?? "FIRST_SURNAME_OTHER",
					})
				: { message: "Select a session and term." },
		enrollStudent: (tx, input) => {
			if (!actor.termId || !actor.sessionId || !ctx.profile.authSessionId)
				throw new Error("Select a school session and term.");
			return enrollStudentInAcademicTermTransaction(
				tx,
				{
					schoolId: actor.schoolId,
					userId: actor.userId,
					bearer: ctx.profile.authSessionId,
				},
				{
					...input,
					schoolSessionId: actor.sessionId,
					sessionTermId: actor.termId,
				},
			);
		},
		moveStudentClass: async (tx, input) => {
			if (!ctx.profile.authSessionId || !actor.termId)
				throw new Error("Select a school term.");
			await tx.studentTermForm.findFirstOrThrow({
				where: {
					id: input.studentTermFormId,
					studentId: input.studentId,
					schoolProfileId: actor.schoolId,
					sessionTermId: actor.termId,
					schoolSessionId: actor.sessionId,
					deletedAt: null,
				},
			});
			return moveStudentTermFormsTransaction(
				tx,
				{
					schoolId: actor.schoolId,
					userId: actor.userId,
					bearer: ctx.profile.authSessionId,
				},
				{
					studentTermFormIds: [input.studentTermFormId],
					classroomDepartmentId: input.classroomDepartmentId,
				},
			);
		},
		receivePayment: async (tx, input) => {
			if (!actor.termId || !actor.sessionId)
				throw new Error("Select a school session and term.");
			await tx.studentTermForm.findFirstOrThrow({
				where: {
					id: input.studentTermFormId,
					studentId: input.studentId,
					schoolProfileId: actor.schoolId,
					sessionTermId: actor.termId,
					schoolSessionId: actor.sessionId,
					deletedAt: null,
					sessionTerm: {
						OR: [
							{ lifecycleStatus: null },
							{ lifecycleStatus: { not: "CLOSED" } },
						],
					},
				},
			});
			const total = input.allocations.reduce(
				(sum, a) => sum.plus(new Prisma.Decimal(a.amountToPay)),
				new Prisma.Decimal(0),
			);
			if (!total.equals(new Prisma.Decimal(input.amountReceived)))
				throw new Error("Allocations must exactly match the amount received.");
			const ids = input.allocations.map((a) => a.studentFeeId).sort();
			if (new Set(ids).size !== ids.length)
				throw new Error("Each fee can appear only once.");
			await tx.$queryRaw(
				Prisma.sql`SELECT "id" FROM "FinanceCharge" WHERE "id" IN (${Prisma.join(ids)}) AND "schoolProfileId"=${actor.schoolId} ORDER BY "id" FOR UPDATE`,
			);
			const paymentIds: string[] = [];
			for (const allocation of input.allocations) {
				await tx.financeCharge.findFirstOrThrow({
					where: {
						id: allocation.studentFeeId,
						schoolProfileId: actor.schoolId,
						studentId: input.studentId,
						studentTermFormId: input.studentTermFormId,
					},
				});
				const result = await recordFinancePaymentInTransaction(ctx, tx, {
					chargeId: allocation.studentFeeId,
					amount: allocation.amountToPay,
					method: input.paymentMethod,
				});
				paymentIds.push(result.paymentId);
			}
			return paymentIds;
		},
	};
	const tools = createSchoolAiTools(context, deps);
	const wrapped: ToolSet = {};
	for (const [name, definition] of Object.entries(tools)) {
		const execute = definition.execute;
		if (!execute) continue;
		const info = assistantToolInfo(name);
		wrapped[name] = {
			...definition,
			execute: async (input, options) => {
				await assertAccess(name);
				const result = await execute(input, options);
				const data = result as Record<string, unknown>;
				if (
					data?.requiresConfirmation &&
					typeof data.confirmationToken === "string"
				) {
					const proposal =
						await ctx.db.assistantActionProposal.findFirstOrThrow({
							where: {
								token: data.confirmationToken,
								schoolProfileId: actor.schoolId,
								userId: actor.userId,
							},
						});
					return {
						status: "requires_approval",
						toolId: name,
						toolVersion: 1,
						data: {
							proposalId: proposal.id,
							summary: proposal.summary,
							actionInput: await proposalPreview(
								ctx,
								actor,
								proposal.payload as Record<string, unknown>,
							),
							expiresAt: proposal.expiresAt.toISOString(),
						},
						observedAt: new Date().toISOString(),
						sources: info
							? [
									{
										label: info.title,
										href: info.href,
									},
								]
							: [],
						invalidationTags: [],
					};
				}
				return {
					status: data?.blocked ? "denied" : "success",
					toolId: name,
					toolVersion: 1,
					data: result,
					observedAt: new Date().toISOString(),
					sources: info
						? [
								{
									label: info.title,
									href: info.href,
								},
							]
						: [],
					invalidationTags: mutationTools.has(name)
						? [getSchoolAiToolPolicy(name)?.capability.split(".")[0] ?? name]
						: [],
				};
			},
		};
	}
	return { tools: wrapped, rawTools: tools, assertAccess, context, deps };
}
export function proposalSummary(
	toolName: string,
	input: Record<string, unknown>,
) {
	const label = toolName.replace(/([A-Z])/g, " $1");
	return `${label[0]?.toUpperCase()}${label.slice(1)}${input.studentName ? ` · ${input.studentName}` : ""}`;
}
