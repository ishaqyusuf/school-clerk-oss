import { exportAssistantConversation } from "../../../../packages/jobs/src/tasks/assistant/export-conversation";
import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";
import { streamAssistant } from "./stream";
import { test, expect } from "bun:test";
import { prisma, getAssistantRunReceipts } from "@school-clerk/db";
import {
	createConversation,
	claimRun,
	finishRun,
	readConversation,
	requestFingerprint,
} from "@school-clerk/db/assistant";
import { resolveAssistantActor } from "./actor";
import { buildAssistantTools } from "./tools";
import { completeAccountAction } from "./account-actions";
import { decideProposal } from "./proposals";
import type { TRPCContext } from "../trpc/init";
const enabled = process.env.ASSISTANT_DB_TEST === "1";
test.skipIf(!enabled)(
	"local database: isolation, atomic dedup, replay-safe approval and recovery",
	async () => {
		const host = new URL(required(process.env.DATABASE_URL)).hostname;
		if (!["localhost", "127.0.0.1", "::1"].includes(host))
			throw new Error("Assistant integration tests require a local database");
		const id = crypto.randomUUID();
		const prefix = `assistant-test-${id}`;
		const account = await prisma.saasAccount.create({
			data: { name: prefix, email: `${prefix}@example.invalid` },
		});
		const schoolIds: string[] = [];
		const userIds: string[] = [];
		try {
			for (const suffix of ["a", "b"]) {
				schoolIds.push(
					(
						await prisma.schoolProfile.create({
							data: {
								name: `${prefix}-${suffix}`,
								slug: `${prefix}-${suffix}`,
								subDomain: `${prefix}-${suffix}`,
								accountId: account.id,
							},
						})
					).id,
				);
				userIds.push(
					(
						await prisma.user.create({
							data: {
								name: prefix,
								email: `${prefix}-${suffix}@example.invalid`,
								role: "Admin",
								saasAccountId: account.id,
							},
						})
					).id,
				);
			}
			const schoolId = required(schoolIds[0]);
			const userId = required(userIds[0]);
			await prisma.schoolModuleConfiguration.create({
				data: {
					schoolProfileId: schoolId,
					version: 1,
					enabledModules: [
						"AI_ASSISTANT",
						"INVENTORY_ASSETS",
						"STAFF_MANAGEMENT",
						"BILLING_FINANCE",
						"STUDENT_MANAGEMENT",
					],
					entitledModules: [
						"AI_ASSISTANT",
						"INVENTORY_ASSETS",
						"STAFF_MANAGEMENT",
						"BILLING_FINANCE",
						"STUDENT_MANAGEMENT",
					],
				},
			});
			await prisma.schoolAssistantConfig.create({
				data: { schoolProfileId: schoolId, enabled: true },
			});
			const login = await prisma.session.create({
				data: {
					userId,
					token: crypto.randomUUID(),
					expiresAt: new Date(Date.now() + 600000),
				},
			});
			const ctx = {
				db: prisma,
				currentUser: {
					id: userId,
					role: "Admin",
					email: `${prefix}-a@example.invalid`,
				},
				profile: { schoolId, authSessionId: login.id },
			} as TRPCContext;
			const actor = await resolveAssistantActor(ctx);
			expect(actor.availableTools).toContain("createInventoryItem");
			const browserActor = await resolveAssistantActor({
				...ctx,
				profile: { ...ctx.profile, authSessionId: required(login.token) },
			});
			expect(browserActor.authSessionId).toBe(login.id);
			expect(browserActor.availableTools).toEqual(actor.availableTools);
			const conversation = await createConversation(prisma, actor);
			expect(
				await readConversation(
					prisma,
					{ ...actor, userId: required(userIds[1]) },
					conversation.id,
				),
			).toBeNull();
			expect(
				await readConversation(
					prisma,
					{ ...actor, schoolId: required(schoolIds[1]) },
					conversation.id,
				),
			).toBeNull();
			expect(
				await readConversation(
					prisma,
					{ ...actor, availableTools: [] },
					conversation.id,
				),
			).toBeNull();
			const request = {
				conversationId: conversation.id,
				requestId: crypto.randomUUID(),
				text: "Create inventory",
				fingerprint: requestFingerprint({ text: "Create inventory" }),
				provider: "domain",
				model: "test",
				dailyRequestLimit: 20,
				dailyTokenLimit: 1000000,
				concurrentRunLimit: 1,
			};
			const claims = await Promise.all([
				claimRun(prisma, actor, request),
				claimRun(prisma, actor, request),
			]);
			expect(claims.filter((c) => c.created)).toHaveLength(1);
			expect(required(claims[0]).run.id).toBe(required(claims[1]).run.id);
			await expect(
				claimRun(prisma, actor, { ...request, fingerprint: "different" }),
			).rejects.toThrow("Request ID");
			const second = await createConversation(prisma, actor);
			await expect(
				claimRun(prisma, actor, {
					...request,
					conversationId: second.id,
					requestId: crypto.randomUUID(),
				}),
			).rejects.toThrow("usage limit");
			const run = required(claims[0]).run;
			const tools = await buildAssistantTools(
				ctx,
				actor,
				run.id,
				conversation.id,
			);
			const result = (await required(
				required(tools.tools.createInventoryItem).execute,
			)(
				{ title: prefix, type: "OTHER", quantity: 3, unitPrice: 0 },
				{ toolCallId: "create", messages: [] },
			)) as { status: string; data: { proposalId: string } };
			expect(result.status).toBe("requires_approval");
			expect(
				await prisma.schoolInventory.count({
					where: { schoolProfileId: schoolId },
				}),
			).toBe(0);
			await finishRun(prisma, actor, {
				runId: run.id,
				conversationId: conversation.id,
				status: "completed",
				text: "Please review",
				parts: [{ type: "text", text: "Please review" }],
				totalTokens: 0,
			});
			await finishRun(prisma, actor, {
				runId: run.id,
				conversationId: conversation.id,
				status: "completed",
				text: "Duplicate",
				parts: [],
				totalTokens: 0,
			});
			expect(
				(await readConversation(prisma, actor, conversation.id))?.messages.map(
					(m) => m.sequence,
				),
			).toEqual([1, 2]);
			const approvals = await Promise.allSettled(
				[1, 2].map(() =>
					decideProposal(ctx, {
						proposalId: result.data.proposalId,
						approve: true,
						requestId: crypto.randomUUID(),
					}),
				),
			);
			expect(
				approvals
					.filter((a) => a.status === "rejected")
					.map((a) => a.reason?.message),
			).not.toHaveLength(2);
			expect(
				await prisma.schoolInventory.count({
					where: { schoolProfileId: schoolId, title: prefix },
				}),
			).toBe(1);
			const repeated = await decideProposal(ctx, {
				proposalId: result.data.proposalId,
				approve: true,
				requestId: crypto.randomUUID(),
			});
			expect(repeated.status).toBe("completed");
			expect(
				await prisma.schoolInventory.count({
					where: { schoolProfileId: schoolId, title: prefix },
				}),
			).toBe(1);
			const saved = await prisma.assistantActionProposal.findUniqueOrThrow({
				where: { id: result.data.proposalId },
			});
			expect(saved.status).toBe("completed");
			expect(saved.result).toBeTruthy();
			const expired = await claimRun(prisma, actor, {
				...request,
				requestId: crypto.randomUUID(),
			});
			await prisma.assistantRun.update({
				where: { id: expired.run.id },
				data: { deadlineAt: new Date(Date.now() - 1000) },
			});
			expect(
				(await readConversation(prisma, actor, conversation.id))?.runs.find(
					(r) => r.id === expired.run.id,
				)?.status,
			).toBe("failed");
			const model = new MockLanguageModelV3({
				doStream: {
					stream: convertArrayToReadableStream([
						{ type: "stream-start", warnings: [] },
						{ type: "text-start", id: "text" },
						{ type: "text-delta", id: "text", delta: "Saved response" },
						{ type: "text-end", id: "text" },
						{
							type: "finish",
							finishReason: { unified: "stop", raw: "stop" },
							usage: {
								inputTokens: {
									total: 4,
									noCache: 4,
									cacheRead: 0,
									cacheWrite: 0,
								},
								outputTokens: { total: 3, text: 3, reasoning: 0 },
							},
						},
					]),
				},
			});
			const streamRequest = {
				conversationId: conversation.id,
				requestId: crypto.randomUUID(),
				text: "Test response",
			};
			const streamed = await streamAssistant(ctx, streamRequest, () => ({
				provider: "test",
				modelName: "test",
				model,
			}));
			if (streamed instanceof Response)
				throw new Error("Expected a fresh stream");
			expect((await streamed.response.text()).includes("Saved response")).toBe(
				true,
			);
			await streamed.completion;
			expect(
				(await readConversation(prisma, actor, conversation.id))?.messages.at(
					-1,
				)?.content,
			).toBe("Saved response");
			const duplicated = await streamAssistant(ctx, streamRequest, () => ({
				provider: "test",
				modelName: "test",
				model,
			}));
			expect(duplicated instanceof Response && duplicated.status).toBe(409);
			expect(model.doStreamCalls.length).toBe(1);
			const failedModel = new MockLanguageModelV3({
				doStream: {
					stream: convertArrayToReadableStream([
						{ type: "stream-start", warnings: [] },
						{ type: "error", error: new Error("Simulated provider failure") },
					]),
				},
			});
			const failedStream = await streamAssistant(
				ctx,
				{
					conversationId: conversation.id,
					requestId: crypto.randomUUID(),
					text: "Failure recovery",
				},
				() => ({ provider: "test", modelName: "test", model: failedModel }),
			);
			if (failedStream instanceof Response)
				throw new Error("Expected fresh failed stream");
			await failedStream.response.text();
			await failedStream.completion;
			expect(
				(await readConversation(prisma, actor, conversation.id))?.runs.find(
					(run) =>
						run.id === failedStream.response.headers.get("x-assistant-run-id"),
				)?.status,
			).toBe("failed");
			const stock = await prisma.schoolInventory.findFirstOrThrow({
				where: { schoolProfileId: schoolId, title: prefix },
			});
			const issuanceRun = await claimRun(prisma, actor, {
				...request,
				requestId: crypto.randomUUID(),
			});
			const issuanceTools = await buildAssistantTools(
				ctx,
				actor,
				issuanceRun.run.id,
				conversation.id,
			);
			const issuance = (await required(
				required(issuanceTools.tools.recordInventoryIssuance).execute,
			)(
				{ inventoryId: stock.id, itemTitle: "Untrusted label", quantity: 1 },
				{ toolCallId: "issue", messages: [] },
			)) as {
				data: { proposalId: string; actionInput: { itemTitle: string } };
			};
			expect(issuance.data.actionInput.itemTitle).toBe(prefix);
			await finishRun(prisma, actor, {
				runId: issuanceRun.run.id,
				conversationId: conversation.id,
				status: "completed",
				totalTokens: 0,
			});
			await prisma.schoolInventory.update({
				where: { id: stock.id },
				data: { quantity: 2 },
			});
			await expect(
				decideProposal(ctx, {
					proposalId: issuance.data.proposalId,
					approve: true,
					requestId: crypto.randomUUID(),
				}),
			).rejects.toThrow("record changed");
			expect(
				await prisma.inventoryIssuance.count({
					where: { schoolProfileId: schoolId },
				}),
			).toBe(0);
			await prisma.assistantActionProposal.update({
				where: { id: issuance.data.proposalId },
				data: { expiresAt: new Date(Date.now() - 1000) },
			});
			await expect(
				decideProposal(ctx, {
					proposalId: issuance.data.proposalId,
					approve: true,
					requestId: crypto.randomUUID(),
				}),
			).rejects.toThrow("Approval expired");

			const schoolSession = await prisma.schoolSession.create({
				data: { schoolId, title: prefix },
			});
			const term = await prisma.sessionTerm.create({
				data: {
					schoolId,
					sessionId: schoolSession.id,
					title: "Term 3",
					startDate: new Date("2026-11-01"),
				},
			});
			const financeCtx = {
				...ctx,
				profile: {
					...ctx.profile,
					sessionId: schoolSession.id,
					termId: term.id,
				},
			};
			const financeActor = await resolveAssistantActor(financeCtx);
			const financeChat = await createConversation(prisma, financeActor);
			const financeRun = await claimRun(prisma, financeActor, {
				...request,
				conversationId: financeChat.id,
				requestId: crypto.randomUUID(),
				concurrentRunLimit: 5,
				dailyTokenLimit: 10_000_000,
			});
			const toolsForFinance = (
				await buildAssistantTools(
					financeCtx,
					financeActor,
					financeRun.run.id,
					financeChat.id,
				)
			).tools;
			const options = { toolCallId: "account-test", messages: [] };
			const runTool = async (name: string, input: unknown) =>
				required(required(toolsForFinance[name]).execute)(input, options);
			const tuition = await prisma.financeStream.create({
				data: {
					schoolProfileId: schoolId,
					name: "School Fees",
					slug: "fees",
					accountType: "CREDIT",
				},
			});
			const payroll = await prisma.financeStream.create({
				data: {
					schoolProfileId: schoolId,
					name: "Salary",
					slug: "salary",
					accountType: "DEBIT",
				},
			});
			const students = await Promise.all(
				["أحمد", "أنس"].map((name) =>
					prisma.students.create({
						data: {
							schoolProfileId: schoolId,
							name,
							surname: "مفتاح",
							gender: "Male",
						},
					}),
				),
			);
			const charges = await Promise.all(
				students.map((student) =>
					prisma.financeCharge.create({
						data: {
							schoolProfileId: schoolId,
							studentId: student.id,
							streamId: tuition.id,
							payerType: "STUDENT",
							title: "School Fees",
							amount: 6000,
							status: "PENDING",
							sessionTermId: term.id,
							schoolSessionId: schoolSession.id,
						},
					}),
				),
			);
			const studentDraft = (await runTool("prepareStudentCollection", {
				students: [
					{ name: "أحمد مفتاح", amount: 3000 },
					{ name: "أنس مفتاح", amount: 3000 },
				],
				transferTotal: 6000,
				method: "Bank Transfer",
				reference: "QA-ACCT-123456",
				date: "2026-11-16",
			})) as {
				data: { draftId: string; card: { matches: { id: string }[][] } };
			};
			expect(studentDraft.data.card.matches.map((row) => row[0]?.id)).toEqual(
				students.map((student) => student.id),
			);
			expect(
				await prisma.financePayment.count({
					where: { schoolProfileId: schoolId },
				}),
			).toBe(0);
			const selection = {
				action: "student_payment" as const,
				method: "Bank Transfer" as const,
				date: "2026-11-16",
				reference: "QA-ACCT-123456",
				lines: charges.map((charge) => ({
					chargeId: charge.id,
					studentId: required(charge.studentId),
					amount: 3000,
				})),
			};
			await expect(
				completeAccountAction(financeCtx, {
					draftId: studentDraft.data.draftId,
					selection: {
						...selection,
						lines: [
							{ ...required(selection.lines[0]), amount: 2000 },
							required(selection.lines[1]),
						],
					},
				}),
			).rejects.toThrow("allocate the full transfer");
			const first = await completeAccountAction(financeCtx, {
				draftId: studentDraft.data.draftId,
				selection,
			});
			expect(first).toMatchObject({ amount: 6000, receipt: { version: 1 } });
			expect(
				await completeAccountAction(financeCtx, {
					draftId: studentDraft.data.draftId,
					selection,
				}),
			).toEqual(first);
			expect(
				await prisma.financePayment.count({
					where: { schoolProfileId: schoolId },
				}),
			).toBe(2);
			const duplicate = (await runTool("prepareStudentCollection", {
				students: [
					{ name: "أحمد مفتاح", amount: 3000 },
					{ name: "أنس مفتاح", amount: 3000 },
				],
				transferTotal: 6000,
				method: "Bank Transfer",
				reference: "QA ACCT 123456",
				date: "2026-11-16",
			})) as { data: { draftId: string } };
			await expect(
				completeAccountAction(financeCtx, {
					draftId: duplicate.data.draftId,
					selection: { ...selection, reference: "qa acct-123456" },
				}),
			).rejects.toThrow("already recorded");
			const staff = await prisma.staffProfile.create({
				data: { schoolProfileId: schoolId, name: "Example Teacher" },
			});
			const salaryDraft = (await runTool("prepareStaffSalary", {
				name: "Example Teacher",
				amount: 2000,
			})) as { data: { draftId: string } };
			expect(
				await completeAccountAction(financeCtx, {
					draftId: salaryDraft.data.draftId,
					selection: {
						action: "staff_payment",
						amount: 2000,
						staffId: staff.id,
						streamId: payroll.id,
					},
				}),
			).toMatchObject({ amount: 2000, receipt: { version: 1 } });
			const transferDraft = (await runTool("prepareAccountTransfer", {
				from: tuition.name,
				to: payroll.name,
				amount: 250,
			})) as { data: { draftId: string } };
			expect(
				await completeAccountAction(financeCtx, {
					draftId: transferDraft.data.draftId,
					selection: {
						action: "transfer",
						amount: 250,
						fromId: tuition.id,
						toId: payroll.id,
						note: "Fund salaries",
					},
				}),
			).toMatchObject({ amount: 250, receipt: { version: 1 } });
			expect(
				await runTool("readSchoolCollections", { period: "current_term" }),
			).toMatchObject({
				data: {
					collected: 6000,
					salariesPaid: 2000,
					collectionsByFee: [{ fee: "School Fees", collected: 6000 }],
				},
			});
			const artifact = await prisma.assistantArtifact.create({
				data: {
					schoolProfileId: schoolId,
					userId,
					conversationId: conversation.id,
					title: "Test export",
					kind: "conversation-pdf",
					status: "queued",
					content: {},
					authSessionId: login.id,
				},
			});
			await exportAssistantConversation(artifact.id);
			const exported = await prisma.assistantArtifact.findUniqueOrThrow({
				where: { id: artifact.id },
			});
			expect(exported.status).toBe("ready");
			expect(
				Buffer.from(required(exported.bytes)).subarray(0, 5).toString(),
			).toBe("%PDF-");
			await prisma.session.update({
				where: { id: login.id },
				data: { expiresAt: new Date(Date.now() - 1000) },
			});
			await expect(resolveAssistantActor(ctx)).rejects.toThrow();
		} finally {
			await prisma.$transaction(async (tx) => {
				await tx.assistantActionProposal.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.assistantRunRequest.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.assistantUsageReservation.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.assistantArtifact.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.activity.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.schoolInventory.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.assistantConversation.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.verification.deleteMany({
					where: { identifier: { contains: schoolIds[0] ?? prefix } },
				});
				await tx.financeLedgerEntry.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.financePaymentAllocation.deleteMany({
					where: { payment: { schoolProfileId: { in: schoolIds } } },
				});
				await tx.financePayment.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.financeTransfer.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.financeCharge.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.financeStream.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.staffProfile.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.students.deleteMany({
					where: { schoolProfileId: { in: schoolIds } },
				});
				await tx.sessionTerm.deleteMany({
					where: { schoolId: { in: schoolIds } },
				});
				await tx.schoolSession.deleteMany({
					where: { schoolId: { in: schoolIds } },
				});
				await tx.schoolProfile.deleteMany({ where: { id: { in: schoolIds } } });
				await tx.user.deleteMany({ where: { id: { in: userIds } } });
				await tx.saasAccount.delete({ where: { id: account.id } });
			});
		}
	},
	30000,
);

function required<T>(value: T | null | undefined): T {
	if (value == null) throw new Error("Required test fixture is missing");
	return value;
}
