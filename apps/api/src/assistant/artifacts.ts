import { tasks } from "@trigger.dev/sdk";
import type { TRPCContext } from "../trpc/init";
import { resolveAssistantActor } from "./actor";
import { readConversation } from "@school-clerk/db/assistant";
import { TRPCError } from "@trpc/server";
export async function createConversationExport(
	ctx: TRPCContext,
	conversationId: string,
) {
	const actor = await resolveAssistantActor(ctx);
	const conversation = await readConversation(ctx.db, actor, conversationId);
	if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
	const existing = await ctx.db.assistantArtifact.findFirst({
		where: {
			conversationId,
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
			status: { in: ["queued", "running"] },
			createdAt: { gt: new Date(Date.now() - 600000) },
		},
		select: { id: true },
	});
	if (existing) return existing;
	const exportsToday = await ctx.db.assistantArtifact.count({
		where: {
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
			createdAt: { gte: new Date(new Date().toISOString().slice(0, 10)) },
		},
	});
	if (exportsToday >= 20)
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: "The daily export limit has been reached.",
		});
	const artifact = await ctx.db.assistantArtifact.create({
		data: {
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
			conversationId,
			title: conversation.title ?? "Assistant export",
			kind: "conversation-pdf",
			status: "queued",
			content: {},
			authSessionId: actor.authSessionId,
		},
	});
	try {
		await tasks.trigger(
			"assistant-export-conversation",
			{ artifactId: artifact.id },
			{ idempotencyKey: `assistant-export:${artifact.id}` },
		);
	} catch {
		await ctx.db.assistantArtifact.update({
			where: { id: artifact.id },
			data: {
				status: "failed",
				error:
					"Document worker is unavailable. Try again when the worker is connected.",
			},
		});
	}
	return { id: artifact.id };
}
