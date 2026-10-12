import { createConversationExport } from "../../assistant/artifacts";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authenticatedProcedure, createTRPCRouter } from "../init";
import { resolveAssistantActor } from "../../assistant/actor";
import { decideProposal, readSavedActions } from "../../assistant/proposals";
import { toUiMessages } from "../../assistant/messages";
import {
	createConversation,
	listConversations,
	readConversation,
	updateConversation,
	jsonValue,
} from "@school-clerk/db/assistant";
import { assistantSettingsSchema } from "@school-clerk/ai/contracts";
import { aiCapabilities } from "@school-clerk/ai";
const id = z.string().min(1).max(191);
export const assistantRouter = createTRPCRouter({
	attachments: authenticatedProcedure
		.input(z.object({ conversationId: id }))
		.query(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx);
			if (!(await readConversation(ctx.db, actor, input.conversationId)))
				throw new TRPCError({ code: "NOT_FOUND" });
			return ctx.db.assistantAttachment.findMany({
				where: {
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
					conversationId: input.conversationId,
					deletedAt: null,
				},
				select: { id: true, name: true, size: true, mediaType: true },
				orderBy: { createdAt: "desc" },
				take: 100,
			});
		}),
	export: authenticatedProcedure
		.input(z.object({ conversationId: id }))
		.mutation(({ ctx, input }) =>
			createConversationExport(ctx, input.conversationId),
		),
	artifacts: authenticatedProcedure
		.input(z.object({ conversationId: id }))
		.query(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx);
			if (!(await readConversation(ctx.db, actor, input.conversationId)))
				throw new TRPCError({ code: "NOT_FOUND" });
			return ctx.db.assistantArtifact.findMany({
				where: {
					conversationId: input.conversationId,
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
				},
				select: {
					id: true,
					title: true,
					status: true,
					error: true,
					kind: true,
				},
				orderBy: { createdAt: "desc" },
				take: 20,
			});
		}),
	bootstrap: authenticatedProcedure.query(async ({ ctx }) => {
		const actor = await resolveAssistantActor(ctx);
		return {
			scope: [actor.schoolId, actor.userId, actor.sessionId, actor.termId].join(
				":",
			),
			capabilities: actor.capabilities,
			availableTools: actor.availableTools,
			schoolId: actor.schoolId,
			sessionId: actor.sessionId,
			termId: actor.termId,
		};
	}),
	create: authenticatedProcedure.mutation(async ({ ctx }) =>
		createConversation(ctx.db, await resolveAssistantActor(ctx)),
	),
	list: authenticatedProcedure
		.input(
			z
				.object({
					search: z.string().max(120).optional(),
					cursor: id.optional(),
					archived: z.boolean().optional(),
				})
				.default({}),
		)
		.query(async ({ ctx, input }) => {
			const rows = await listConversations(
				ctx.db,
				await resolveAssistantActor(ctx),
				input,
			);
			return {
				items: rows.slice(0, 30),
				nextCursor: rows.length > 30 ? rows[29]?.id : undefined,
			};
		}),
	get: authenticatedProcedure
		.input(z.object({ conversationId: id }))
		.query(async ({ ctx, input }) => {
			const result = await readConversation(
				ctx.db,
				await resolveAssistantActor(ctx),
				input.conversationId,
			);
			if (!result) throw new TRPCError({ code: "NOT_FOUND" });
			return { ...result, messages: toUiMessages(result.messages) };
		}),
	update: authenticatedProcedure
		.input(
			z.object({
				conversationId: id,
				title: z.string().trim().min(1).max(120).optional(),
				archived: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await updateConversation(
				ctx.db,
				await resolveAssistantActor(ctx),
				{ ...input, conversationId: input.conversationId ?? "" },
			);
			if (!result) throw new TRPCError({ code: "NOT_FOUND" });
			return { id: result.id };
		}),
	proposals: authenticatedProcedure
		.input(z.object({ conversationId: id }))
		.query(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx);
			if (!(await readConversation(ctx.db, actor, input.conversationId)))
				throw new TRPCError({ code: "NOT_FOUND" });
			return ctx.db.assistantActionProposal.findMany({
				where: {
					conversationId: input.conversationId,
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
				},
				select: {
					id: true,
					status: true,
					summary: true,
					toolName: true,
					payload: true,
					result: true,
					expiresAt: true,
				},
				orderBy: { createdAt: "desc" },
				take: 30,
			});
		}),
	decide: authenticatedProcedure
		.input(
			z.object({
				proposalId: id,
				approve: z.boolean(),
				requestId: z.string().uuid(),
			}),
		)
		.mutation(({ ctx, input }) =>
			decideProposal(ctx, {
				proposalId: input.proposalId ?? "",
				approve: input.approve === true,
				requestId: input.requestId ?? "",
			}),
		),
	receipts: authenticatedProcedure
		.input(z.object({ conversationId: id }))
		.query(({ ctx, input }) => readSavedActions(ctx, input.conversationId)),
	cancel: authenticatedProcedure
		.input(z.object({ runId: id }))
		.mutation(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx);
			await ctx.db.assistantRun.updateMany({
				where: {
					id: input.runId,
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
					status: "running",
				},
				data: { cancelRequested: true },
			});
			return { ok: true };
		}),
	settings: authenticatedProcedure.query(async ({ ctx }) => {
		const actor = await resolveAssistantActor(ctx, true);
		return {
			config: actor.config,
			capabilities: aiCapabilities.map((c) => ({ key: c.key, title: c.label })),
			available: actor.moduleAccess.effectiveModules.includes("AI_ASSISTANT"),
		};
	}),
	saveSettings: authenticatedProcedure
		.input(assistantSettingsSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx, true);
			if (
				input.disabledCapabilities.some(
					(key) => !aiCapabilities.some((c) => c.key === key),
				)
			)
				throw new TRPCError({ code: "BAD_REQUEST" });
			return ctx.db.schoolAssistantConfig.upsert({
				where: { schoolProfileId: actor.schoolId },
				create: { schoolProfileId: actor.schoolId, ...input },
				update: input,
			});
		}),
	preferences: authenticatedProcedure.query(async ({ ctx }) => {
		const actor = await resolveAssistantActor(ctx);
		return ctx.db.assistantPreference.findUnique({
			where: {
				schoolProfileId_userId: {
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
				},
			},
		});
	}),
	savePreferences: authenticatedProcedure
		.input(
			z.object({
				locale: z.enum(["auto", "en", "ar"]),
				savedPrompts: z
					.array(
						z.object({
							id: z.string().uuid(),
							title: z.string().trim().min(1).max(80),
							text: z.string().trim().min(1).max(4000),
						}),
					)
					.max(30),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx);
			return ctx.db.assistantPreference.upsert({
				where: {
					schoolProfileId_userId: {
						schoolProfileId: actor.schoolId,
						userId: actor.userId,
					},
				},
				create: {
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
					...input,
					savedPrompts: jsonValue(input.savedPrompts),
				},
				update: { ...input, savedPrompts: jsonValue(input.savedPrompts) },
			});
		}),
	usage: authenticatedProcedure.query(async ({ ctx }) => {
		const actor = await resolveAssistantActor(ctx, true);
		const day = new Date().toISOString().slice(0, 10);
		const rows = await ctx.db.assistantUsageReservation.findMany({
			where: { schoolProfileId: actor.schoolId, userId: actor.userId, day },
			select: { actualTokens: true, reservedTokens: true, status: true },
		});
		return {
			day,
			requests: rows.length,
			tokens: rows.reduce((n, r) => n + (r.actualTokens ?? 0), 0),
			unknown: rows.filter((r) => r.actualTokens === null).length,
		};
	}),
	feedback: authenticatedProcedure
		.input(
			z.object({ conversationId: id, rating: z.number().int().min(1).max(5) }),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await resolveAssistantActor(ctx);
			if (!(await readConversation(ctx.db, actor, input.conversationId)))
				throw new TRPCError({ code: "NOT_FOUND" });
			await ctx.db.assistantFeedback.create({
				data: {
					schoolProfileId: actor.schoolId,
					userId: actor.userId,
					...input,
				},
			});
			return { ok: true };
		}),
});
