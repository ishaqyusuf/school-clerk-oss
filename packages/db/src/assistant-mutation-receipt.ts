import type { Prisma } from "./generated/client";

export type AssistantMutationTransaction = Pick<Prisma.TransactionClient, "assistantToolExecution" | "activity">;
export type AssistantMutationScope = {
  executionId: string;
  runId: string;
  conversationId: string;
  schoolId: string;
  userId: string;
  userName: string;
  toolName: string;
};

// Domain writes, approval consumption, receipt and activity share this transaction.
export async function completeAssistantMutation(tx: AssistantMutationTransaction, params: AssistantMutationScope & {
  output: Prisma.InputJsonObject;
  title: string;
  description: string;
}) {
  const completedAt = new Date();
  const receipt = { version: 1, executionId: params.executionId, completedAt: completedAt.toISOString() };
  const output = { ...params.output, receipt };
  const completed = await tx.assistantToolExecution.updateMany({
    where: {
      id: params.executionId, runId: params.runId, conversationId: params.conversationId,
      schoolProfileId: params.schoolId, toolName: params.toolName,
      isMutation: true, status: "started", deletedAt: null,
      run: { userId: params.userId, schoolProfileId: params.schoolId, deletedAt: null },
      conversation: { createdByUserId: params.userId, schoolProfileId: params.schoolId, deletedAt: null },
    },
    data: { status: "completed", output, error: null, completedAt },
  });
  if (completed.count !== 1) throw new Error("The action receipt could not be saved. No changes were committed.");
  await tx.activity.create({
    data: {
      schoolProfileId: params.schoolId, userId: params.userId, author: params.userName,
      source: "system", type: "assistant_action_completed",
      title: params.title, description: params.description,
      meta: { toolName: params.toolName, executionId: params.executionId, output },
    },
  });
  return receipt;
}

export async function getAssistantRunReceipts(
  db: Pick<Prisma.TransactionClient, "assistantRun" | "assistantToolExecution">,
  params: { runId: string; schoolId: string; userId: string; toolNames: string[] },
) {
  const run = await db.assistantRun.findFirst({
    where: {
      id: params.runId, schoolProfileId: params.schoolId, userId: params.userId, deletedAt: null,
      conversation: { schoolProfileId: params.schoolId, createdByUserId: params.userId, deletedAt: null },
    },
    select: { id: true, status: true, conversationId: true },
  });
  if (!run) return null;
  const receipts = await db.assistantToolExecution.findMany({
    where: {
      runId: run.id, conversationId: run.conversationId, schoolProfileId: params.schoolId,
      deletedAt: null, status: "completed", isMutation: true,
      toolName: { in: params.toolNames }, output: { path: ["receipt", "version"], equals: 1 },
    },
    select: { id: true, toolName: true, completedAt: true, output: true },
    orderBy: { completedAt: "asc" },
  });
  return { runId: run.id, conversationId: run.conversationId, status: run.status, receipts };
}
