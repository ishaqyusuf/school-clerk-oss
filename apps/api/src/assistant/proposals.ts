import {
	jsonValue,
	claimRun,
	finishRun,
	requestFingerprint,
	readConversation,
} from "@school-clerk/db/assistant";
import { getAssistantRunReceipts } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/init";
import { resolveAssistantActor } from "./actor";
import { buildAssistantTools } from "./tools";

export async function decideProposal(
	ctx: TRPCContext,
	input: { proposalId: string; approve: boolean; requestId: string },
) {
	const actor = await resolveAssistantActor(ctx);
	const proposal = await ctx.db.assistantActionProposal.findFirst({
		where: {
			id: input.proposalId,
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
		},
	});
	if (
		!proposal ||
		!(await readConversation(ctx.db, actor, proposal.conversationId))
	)
		throw new TRPCError({ code: "NOT_FOUND" });
	if (!actor.availableTools.includes(proposal.toolName))
		throw new TRPCError({ code: "FORBIDDEN" });
	if (proposal.status === "completed")
		return { status: "completed", result: proposal.result };
	if (!input.approve) {
		await ctx.db.assistantActionProposal.updateMany({
			where: { id: proposal.id, status: "pending" },
			data: { status: "rejected" },
		});
		const current = await ctx.db.assistantActionProposal.findUniqueOrThrow({
			where: { id: proposal.id },
			select: { status: true },
		});
		return { status: current.status };
	}
	if (
		proposal.status !== "pending" ||
		proposal.expiresAt <= new Date() ||
		proposal.sessionId !== actor.sessionId ||
		proposal.termId !== actor.termId
	)
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Approval expired or the workspace changed. Request a new review.",
		});
	if (!actor.config) throw new TRPCError({ code: "FORBIDDEN" });
	const claimed = await claimRun(ctx.db, actor, {
		conversationId: proposal.conversationId,
		requestId: input.requestId,
		text: `Approved: ${proposal.summary}`,
		fingerprint: requestFingerprint(input),
		provider: "domain",
		model: "reviewed-action",
		...actor.config,
	});
	if (!claimed.created)
		return { status: claimed.run.status, runId: claimed.run.id };
	const runId = claimed.run.id;
	try {
		const built = await buildAssistantTools(
			ctx,
			actor,
			runId,
			proposal.conversationId,
			{ id: proposal.id, toolName: proposal.toolName, token: proposal.token },
		);
		const definition = built.tools[proposal.toolName];
		if (!definition?.execute) throw new Error("Tool unavailable");
		const payload = {
			...(proposal.payload as Record<string, unknown>),
			confirmationToken: proposal.token,
		};
		const result = await definition.execute(payload, {
			toolCallId: proposal.id,
			messages: [],
		});
		const saved = await ctx.db.assistantActionProposal.findUniqueOrThrow({
			where: { id: proposal.id },
		});
		if (saved.status !== "completed")
			throw new Error("Action was not committed. Request a new review.");
		await finishRun(ctx.db, actor, {
			runId,
			conversationId: proposal.conversationId,
			status: "completed",
			text: "Action completed.",
			parts: [
				{
					type: `tool-${proposal.toolName}`,
					toolCallId: proposal.id,
					state: "output-available",
					input: proposal.payload,
					output: result,
				},
			],
			totalTokens: 0,
		});
		return { status: "completed", runId, result: jsonValue(result) };
	} catch (error) {
		await finishRun(ctx.db, actor, {
			runId,
			conversationId: proposal.conversationId,
			status: "failed",
			error: "Action could not be confirmed. Check saved actions.",
			totalTokens: 0,
		});
		const saved = await ctx.db.assistantActionProposal.findUnique({
			where: { id: proposal.id },
		});
		if (saved?.status === "completed")
			return { status: "completed", runId, result: saved.result };
		throw new TRPCError({
			code: "CONFLICT",
			message:
				error instanceof Error
					? error.message
					: "Check saved actions before retrying.",
		});
	}
}
export async function readSavedActions(
	ctx: TRPCContext,
	conversationId: string,
) {
	const actor = await resolveAssistantActor(ctx);
	const runs = await ctx.db.assistantRun.findMany({
		where: {
			conversationId,
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
			deletedAt: null,
			conversation: {
				schoolProfileId: actor.schoolId,
				createdByUserId: actor.userId,
				deletedAt: null,
			},
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 30,
		select: { id: true },
	});
	return (
		await Promise.all(
			runs.map((run) =>
				getAssistantRunReceipts(ctx.db, {
					...actor,
					runId: run.id,
					toolNames: actor.availableTools,
				}),
			),
		)
	).flatMap((run) => run?.receipts ?? []);
}
