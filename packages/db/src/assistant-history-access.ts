import { Prisma } from "./generated/client";
import type { Database } from "./prisma";

type HistoryScope = { schoolId: string; userId: string; availableTools: string[] };

function historyTools(meta: Prisma.JsonValue | null): string[] | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const policy = meta.historyAccess;
  if (!policy || typeof policy !== "object" || Array.isArray(policy) || policy.version !== 1) return null;
  const tools = policy.toolNames;
  if (!Array.isArray(tools) || !tools.every((tool): tool is string => typeof tool === "string" && tool.length > 0)) return null;
  if (new Set(tools).size !== tools.length) return null;
  return tools;
}

export function assistantHistoryMetadata(toolNames: string[]) {
  return { historyAccess: { version: 1, toolNames: [...new Set(toolNames)].sort() } };
}

export async function withAssistantConversationAccess<T>(
  db: Database,
  scope: HistoryScope & { conversationId: string; mode?: "read" | "extend" | "append" },
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T | null> {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "AssistantConversation"
      WHERE "id" = ${scope.conversationId} AND "schoolProfileId" = ${scope.schoolId}
      AND "createdByUserId" = ${scope.userId} AND "deletedAt" IS NULL FOR UPDATE`);
    if (!locked.length) return null;
    const mode = scope.mode ?? "read";
    const row = await tx.assistantConversation.findFirst({
      where: { id: scope.conversationId, schoolProfileId: scope.schoolId, createdByUserId: scope.userId, deletedAt: null },
      select: { meta: true, status: true },
    });
    const required = row ? historyTools(row.meta) : null;
    if (!required) return null;
    // Trusted in-flight writers may finish into a scope another run broadened.
    const permitted = mode === "append"
      ? scope.availableTools.every((tool) => required.includes(tool))
      : required.every((tool) => scope.availableTools.includes(tool));
    if (!permitted || (mode !== "read" && row?.status !== "active")) return null;
    if (mode === "extend" && scope.availableTools.some((tool) => !required.includes(tool))) {
      const meta = row?.meta;
      await tx.assistantConversation.update({
        where: { id: scope.conversationId },
        data: { meta: {
          ...(meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {}),
          ...assistantHistoryMetadata([...required, ...scope.availableTools]),
        } },
      });
    }
    return operation(tx);
  });
}

export async function withAssistantHistoryList<T>(
  db: Database, scope: HistoryScope,
  operation: (tx: Prisma.TransactionClient, conversationIds: string[]) => Promise<T>,
) {
  return db.$transaction(async (tx) => {
    // Shared locks prevent a concurrent run from broadening scope between its
    // metadata check and the subsequent content/aggregate queries.
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "AssistantConversation"
      WHERE "schoolProfileId" = ${scope.schoolId} AND "createdByUserId" = ${scope.userId}
      AND "deletedAt" IS NULL ORDER BY "id" FOR SHARE`);
    const rows = await tx.assistantConversation.findMany({
      where: { id: { in: locked.map((row) => row.id) }, schoolProfileId: scope.schoolId, createdByUserId: scope.userId, deletedAt: null },
      select: { id: true, meta: true },
    });
    const ids = rows.filter((row) => {
      const required = historyTools(row.meta);
      return required !== null && required.every((tool) => scope.availableTools.includes(tool));
    }).map((row) => row.id);
    return operation(tx, ids);
  });
}
