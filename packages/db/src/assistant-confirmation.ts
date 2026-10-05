import type { Prisma } from "./generated/client";

export type AssistantConfirmationTransaction = Pick<
  Prisma.TransactionClient,
  "verification" | "assistantRun"
>;

export type AssistantConfirmationScope = {
  confirmationId: string;
  tokenDigest: string;
  schoolId: string;
  userId: string;
  conversationId: string;
  runId: string;
  expiresAt: Date;
};

export class AssistantConfirmationUnavailableError extends Error {
  constructor() {
    super("This approval expired, was already used, or is unavailable. Check the action history before requesting another approval.");
    this.name = "AssistantConfirmationUnavailableError";
  }
}

function confirmationRecord(scope: AssistantConfirmationScope) {
  if (!/^[a-f0-9]{64}$/.test(scope.confirmationId) ||
    !/^[a-f0-9]{64}$/.test(scope.tokenDigest)) {
    throw new AssistantConfirmationUnavailableError();
  }
  return {
    id: `assistant-confirmation:v2:${scope.confirmationId}`,
    identifier: JSON.stringify(["assistant-confirmation:v2", scope.schoolId, scope.userId, scope.conversationId]),
    value: scope.tokenDigest,
  };
}

async function assertRunScope(db: AssistantConfirmationTransaction, scope: AssistantConfirmationScope) {
  const run = await db.assistantRun.findFirst({
    where: {
      id: scope.runId, schoolProfileId: scope.schoolId, userId: scope.userId,
      conversationId: scope.conversationId, deletedAt: null, status: "running",
      conversation: {
        schoolProfileId: scope.schoolId, createdByUserId: scope.userId,
        status: "active", deletedAt: null,
      },
    },
    select: { id: true },
  });
  if (!run || scope.expiresAt.getTime() <= Date.now()) {
    throw new AssistantConfirmationUnavailableError();
  }
}

export async function createAssistantConfirmation(db: AssistantConfirmationTransaction, scope: AssistantConfirmationScope) {
  const record = confirmationRecord(scope);
  await assertRunScope(db, scope);
  // Create only: retries must never recreate an approval that was consumed.
  await db.verification.create({ data: { ...record, expiresAt: scope.expiresAt } });
}

// Call only inside the same transaction as the protected domain writes.
export async function consumeAssistantConfirmation(tx: AssistantConfirmationTransaction, scope: AssistantConfirmationScope) {
  const record = confirmationRecord(scope);
  await assertRunScope(tx, scope);
  const consumed = await tx.verification.deleteMany({
    where: { ...record, deletedAt: null, expiresAt: { gt: new Date() } },
  });
  // Recheck wall time after a possible concurrent-row lock wait.
  if (consumed.count !== 1 || scope.expiresAt.getTime() <= Date.now()) {
    throw new AssistantConfirmationUnavailableError();
  }
}
