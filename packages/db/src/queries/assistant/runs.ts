import { createHash } from "node:crypto";
import { Prisma } from "../../generated/client";
import type { Database } from "../../prisma";
import { withAssistantConversationAccess } from "../../assistant-history-access";
import { appendMessage, jsonValue, type AssistantScope } from "./history";
export class AssistantRequestError extends Error {
	constructor(
		public code: "CONFLICT" | "TOO_MANY_REQUESTS" | "NOT_FOUND",
		message: string,
	) {
		super(message);
	}
}
export function requestFingerprint(value: unknown): string {
	const canonical = (value: unknown): unknown =>
		Array.isArray(value)
			? value.map(canonical)
			: value && typeof value === "object"
				? Object.fromEntries(
						Object.entries(value)
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([k, v]) => [k, canonical(v)]),
					)
				: value;
	return createHash("sha256")
		.update(JSON.stringify(canonical(JSON.parse(JSON.stringify(value)))))
		.digest("hex");
}
export async function claimRun(
	db: Database,
	scope: AssistantScope,
	input: {
		conversationId: string;
		requestId: string;
		text: string;
		records?: unknown;
		attachmentIds?: string[];
		fingerprint: string;
		provider: string;
		model: string;
		dailyRequestLimit: number;
		dailyTokenLimit: number;
		concurrentRunLimit: number;
	},
) {
	const value = await withAssistantConversationAccess(
		db,
		{ ...scope, conversationId: input.conversationId, mode: "extend" },
		async (tx) => {
			await tx.$queryRaw(
				Prisma.sql`SELECT "id" FROM "SchoolAssistantConfig" WHERE "schoolProfileId"=${scope.schoolId} FOR UPDATE`,
			);
			const existing = await tx.assistantRun.findFirst({
				where: {
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					requestId: input.requestId,
				},
			});
			if (existing) {
				if (
					existing.fingerprint !== input.fingerprint ||
					existing.conversationId !== input.conversationId
				)
					throw new AssistantRequestError(
						"CONFLICT",
						"Request ID already belongs to another message.",
					);
				return { run: existing, created: false };
			}
			const conversation = await tx.assistantConversation.findUniqueOrThrow({
				where: { id: input.conversationId },
			});
			if (conversation.protocolVersion !== 2)
				throw new AssistantRequestError(
					"CONFLICT",
					"Start a new conversation to use the replacement assistant.",
				);
			const now = new Date();
			const day = now.toISOString().slice(0, 10);
			const active = await tx.assistantRun.count({
				where: {
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					status: "running",
					deadlineAt: { gt: now },
				},
			});
			const conversationActive = await tx.assistantRun.count({
				where: {
					conversationId: input.conversationId,
					status: "running",
					deadlineAt: { gt: now },
				},
			});
			const usage = await tx.assistantUsageReservation.findMany({
				where: { schoolProfileId: scope.schoolId, userId: scope.userId, day },
				select: { reservedTokens: true, actualTokens: true },
			});
			const reservedTokens = input.provider === "domain" ? 0 : 200000;
			if (
				active >= input.concurrentRunLimit ||
				conversationActive ||
				usage.length >= input.dailyRequestLimit ||
				usage.reduce((n, r) => n + (r.actualTokens ?? r.reservedTokens), 0) +
					reservedTokens >
					input.dailyTokenLimit
			)
				throw new AssistantRequestError(
					"TOO_MANY_REQUESTS",
					"Assistant usage limit reached. Wait for the current response or the next daily reset.",
				);
			const run = await tx.assistantRun.create({
				data: {
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					conversationId: input.conversationId,
					requestId: input.requestId,
					fingerprint: input.fingerprint,
					provider: input.provider,
					model: input.model,
					requestType: "chat-v2",
					deadlineAt: new Date(now.getTime() + 55000),
				},
			});
			await tx.assistantRunRequest.create({
				data: {
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					requestId: input.requestId,
					runId: run.id,
					fingerprint: input.fingerprint,
				},
			});
			await tx.assistantUsageReservation.create({
				data: {
					id: run.id,
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					day,
					reservedTokens,
				},
			});
			await appendMessage(tx, scope, {
				conversationId: input.conversationId,
				role: "user",
				content: input.text,
				parts: [
					{ type: "text", text: input.text },
					...(input.records || input.attachmentIds?.length
						? [
								{
									type: "data-context",
									data: {
										records: input.records ?? [],
										attachmentIds: input.attachmentIds ?? [],
									},
								},
							]
						: []),
				],
				requestKey: `${run.id}:user`,
			});
			if (conversation.title === "New conversation")
				await tx.assistantConversation.update({
					where: { id: input.conversationId },
					data: { title: input.text.slice(0, 80) },
				});
			return { run, created: true };
		},
	);
	if (!value)
		throw new AssistantRequestError(
			"NOT_FOUND",
			"Conversation is unavailable.",
		);
	return value;
}
export async function finishRun(
	db: Database,
	scope: AssistantScope,
	input: {
		runId: string;
		conversationId: string;
		status: "completed" | "failed" | "cancelled";
		text?: string;
		parts?: unknown;
		usage?: unknown;
		totalTokens?: number;
		error?: string;
	},
) {
	return withAssistantConversationAccess(
		db,
		{ ...scope, conversationId: input.conversationId, mode: "append" },
		async (tx) => {
			const updated = await tx.assistantRun.updateMany({
				where: {
					id: input.runId,
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					status: "running",
				},
				data: {
					status: input.status,
					completedAt: new Date(),
					usage: input.usage ? jsonValue(input.usage) : undefined,
					error: input.error,
				},
			});
			if (!updated.count) return;
			if (input.parts)
				await appendMessage(tx, scope, {
					conversationId: input.conversationId,
					role: "assistant",
					content: input.text ?? "",
					parts: input.parts,
					requestKey: `${input.runId}:assistant`,
				});
			await tx.assistantUsageReservation.updateMany({
				where: { id: input.runId },
				data: { status: "settled", actualTokens: input.totalTokens },
			});
		},
	);
}
