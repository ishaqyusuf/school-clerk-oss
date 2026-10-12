import type { Prisma } from "../../generated/client";
import type { Database, DatabaseTransaction } from "../../prisma";
import {
	assistantHistoryMetadata,
	withAssistantConversationAccess,
	withAssistantHistoryList,
} from "../../assistant-history-access";
export type AssistantScope = {
	schoolId: string;
	userId: string;
	availableTools: string[];
};
export const jsonValue = (value: unknown): Prisma.InputJsonValue =>
	JSON.parse(JSON.stringify(value));
export function ownedConversation(scope: AssistantScope) {
	return {
		schoolProfileId: scope.schoolId,
		createdByUserId: scope.userId,
		deletedAt: null,
	};
}
export async function createConversation(db: Database, scope: AssistantScope) {
	return db.assistantConversation.create({
		data: {
			schoolProfileId: scope.schoolId,
			createdByUserId: scope.userId,
			title: "New conversation",
			protocolVersion: 2,
			meta: assistantHistoryMetadata(scope.availableTools),
		},
	});
}
export async function listConversations(
	db: Database,
	scope: AssistantScope,
	input: { search?: string; cursor?: string; archived?: boolean } = {},
) {
	return withAssistantHistoryList(db, scope, (tx, ids) =>
		tx.assistantConversation.findMany({
			where: {
				...ownedConversation(scope),
				id: { in: ids },
				status: input.archived ? "archived" : "active",
				...(input.search
					? { title: { contains: input.search, mode: "insensitive" as const } }
					: {}),
			},
			select: {
				id: true,
				title: true,
				status: true,
				protocolVersion: true,
				lastMessageAt: true,
			},
			orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
			take: 31,
			...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		}),
	);
}
export async function readConversation(
	db: Database,
	scope: AssistantScope,
	conversationId: string,
) {
	return withAssistantConversationAccess(
		db,
		{ ...scope, conversationId },
		async (tx) => {
			const conversation = await tx.assistantConversation.findFirst({
				where: { ...ownedConversation(scope), id: conversationId },
				select: { id: true, title: true, status: true, protocolVersion: true },
			});
			if (!conversation) return null;
			await tx.assistantRun.updateMany({
				where: {
					conversationId,
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					status: "running",
					deadlineAt: { lt: new Date() },
				},
				data: {
					status: "failed",
					completedAt: new Date(),
					error:
						"Response interrupted. Check saved actions before repeating a change.",
				},
			});
			const messages = await tx.assistantMessage.findMany({
				where: {
					conversationId,
					schoolProfileId: scope.schoolId,
					deletedAt: null,
				},
				orderBy: [{ createdAt: "desc" }, { sequence: "desc" }, { id: "desc" }],
				take: 100,
			});
			const runs = await tx.assistantRun.findMany({
				where: {
					conversationId,
					schoolProfileId: scope.schoolId,
					userId: scope.userId,
					deletedAt: null,
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 10,
				select: {
					id: true,
					status: true,
					error: true,
					requestId: true,
					deadlineAt: true,
					cancelRequested: true,
				},
			});
			return { ...conversation, messages: messages.reverse(), runs };
		},
	);
}
export async function updateConversation(
	db: Database,
	scope: AssistantScope,
	input: { conversationId: string; title?: string; archived?: boolean },
) {
	return withAssistantConversationAccess(
		db,
		{ ...scope, conversationId: input.conversationId },
		async (tx) => {
			if (
				input.archived &&
				(await tx.assistantRun.count({
					where: {
						conversationId: input.conversationId,
						status: "running",
						deadlineAt: { gt: new Date() },
					},
				}))
			)
				throw new Error("Wait for the response to finish before archiving.");
			return tx.assistantConversation.update({
				where: { id: input.conversationId },
				data: {
					title: input.title,
					status:
						input.archived === undefined
							? undefined
							: input.archived
								? "archived"
								: "active",
				},
			});
		},
	);
}
export async function appendMessage(
	tx: DatabaseTransaction,
	scope: AssistantScope,
	input: {
		conversationId: string;
		role: "user" | "assistant";
		content: string;
		parts: unknown;
		requestKey: string;
	},
) {
	const conversation = await tx.assistantConversation.update({
		where: { id: input.conversationId },
		data: { nextSequence: { increment: 1 }, lastMessageAt: new Date() },
	});
	return tx.assistantMessage.create({
		data: {
			conversationId: input.conversationId,
			schoolProfileId: scope.schoolId,
			createdByUserId: scope.userId,
			role: input.role,
			content: input.content,
			parts: jsonValue(input.parts),
			sequence: conversation.nextSequence,
			requestKey: input.requestKey,
		},
	});
}
