import "server-only";
import type { ResolvedModuleAccess } from "@school-clerk/utils/module-config";

import { DashboardAccessError, dashboardAccessErrorResponse, requireDashboardModules, requireDashboardSchoolContext } from "@/lib/module-access";
import {
  type AssistantConversation,
  type AssistantFeedback,
  type AssistantMessage,
  type AssistantRun,
  type AssistantToolExecution,
  type SchoolAssistantConfig,
  type AssistantConfirmationTransaction,
  createAssistantConfirmation,
  consumeAssistantConfirmation,
  assistantHistoryMetadata,
  withAssistantConversationAccess,
  withAssistantHistoryList,
  prisma,
} from "@school-clerk/db";

import {
  aiCapabilities,
  aiCapabilityMap,
  chatInputSchema,
  detectAiChatLocale,
  safeJsonParse,
  buildSchoolAiConfirmationToken,
  readSchoolAiConfirmationToken,
  schoolAiConfirmationDigest,
  type SchoolAiToolConfirmationPayload,
  type SchoolAiSignedConfirmationPayload,
  summarizeConversationTitle,
  workflowActionToMessage,
  getSchoolAiToolPolicy,
  getSchoolAiAvailableToolNames,
  hasSchoolAiCapabilityModules,
  SchoolAiToolAccessError,
  type SchoolAiToolContext,
  type AiCapabilityKey,
  type AiMessagePart,
  type ChatInput,
  type WorkflowAction,
} from "@school-clerk/ai";

const DEFAULT_ALLOWED_ROLES = [
  "Admin",
  "Registrar",
  "Accountant",
  "Teacher",
  "Staff",
];
const CURRENT_RELEASED_CHAT_ROLES = ["Admin"];
const DEFAULT_PREFERRED_PROVIDER = "deepseek";
const DEFAULT_ROLLOUT_STAGE = "beta";

function getConfirmationSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("AI confirmation signing is not configured.");
  return secret;
}

export async function getAssistantSessionContext(options: { settingsRecovery?: boolean } = {}) {
  const scope = await (options.settingsRecovery
    ? requireDashboardSchoolContext(CURRENT_RELEASED_CHAT_ROLES)
    : requireDashboardModules(["AI_ASSISTANT"], CURRENT_RELEASED_CHAT_ROLES)
  ).catch(dashboardAccessErrorResponse);
  if (scope instanceof Response) return scope;
  const { profile, user } = scope;
  if (!CURRENT_RELEASED_CHAT_ROLES.includes(user.role ?? "")) {
    return dashboardAccessErrorResponse(new DashboardAccessError(403, "AI access is not released for this role."));
  }

  return {
    schoolId: profile.schoolId,
    termId: profile.termId ?? null,
    sessionId: profile.sessionId ?? null,
    userId: user.id,
    role: user.role,
    moduleAccess: scope.access,
    userName: user.name ?? "School Clerk User",
    userEmail: user.email ?? null,
  };
}

export async function getAssistantHistoryContext() {
  const context = await getAssistantSessionContext();
  if (context instanceof Response) return context;
  const config = await prisma.schoolAssistantConfig.findFirst({
    where: { schoolProfileId: context.schoolId, deletedAt: null },
  });
  if (!config?.enabled) return dashboardAccessErrorResponse(new DashboardAccessError(403, "AI access is unavailable."));
  const capabilities = getAllowedCapabilities({ role: context.role, config, moduleAccess: context.moduleAccess });
  return { ...context, config, capabilities,
    availableTools: getSchoolAiAvailableToolNames(context.moduleAccess, capabilities) };
}

export async function ensureAssistantConfig(schoolId: string) {
  const existing = await prisma.schoolAssistantConfig.findFirst({
    where: { schoolProfileId: schoolId },
  });

  if (existing) {
    const currentCapabilityKeys = aiCapabilities.map((cap) => cap.key);
    const enabledCapabilities = safeJsonParse<AiCapabilityKey[]>(
      existing.enabledCapabilities,
      currentCapabilityKeys,
    );
    const missingCapabilities = (["assessments.write"] as AiCapabilityKey[]).filter(
      (key) => currentCapabilityKeys.includes(key) && !enabledCapabilities.includes(key),
    );

    if (!existing.preferredProvider || missingCapabilities.length) {
      return prisma.schoolAssistantConfig.update({
        where: { schoolProfileId: schoolId },
        data: {
          preferredProvider: existing.preferredProvider ?? DEFAULT_PREFERRED_PROVIDER,
          enabledCapabilities: missingCapabilities.length
            ? [...enabledCapabilities, ...missingCapabilities]
            : existing.enabledCapabilities,
        },
      });
    }

    return existing;
  }

  return prisma.schoolAssistantConfig.create({
    data: {
      schoolProfileId: schoolId,
      preferredProvider: DEFAULT_PREFERRED_PROVIDER,
      allowedRoles: DEFAULT_ALLOWED_ROLES,
      enabledCapabilities: aiCapabilities.map((cap) => cap.key),
      rolloutStage: DEFAULT_ROLLOUT_STAGE,
    },
  });
}

export function getAllowedCapabilities({
  role,
  config,
  moduleAccess,
}: {
  role: string | null;
  config: SchoolAssistantConfig;
  moduleAccess: ResolvedModuleAccess;
}) {
  const allowedRoles = safeJsonParse<string[]>(
    config.allowedRoles,
    DEFAULT_ALLOWED_ROLES,
  );
  const enabledCapabilities = safeJsonParse<AiCapabilityKey[]>(
    config.enabledCapabilities,
    aiCapabilities.map((cap) => cap.key),
  );
  const disabledCapabilities = new Set(
    safeJsonParse<AiCapabilityKey[]>(config.disabledCapabilities, []),
  );

  if (
    !config.enabled ||
    !role ||
    !CURRENT_RELEASED_CHAT_ROLES.includes(role) ||
    !allowedRoles.includes(role)
  ) {
    return [] as AiCapabilityKey[];
  }

  return enabledCapabilities.filter((key) => {
    const capability = aiCapabilityMap[key];
    return (
      capability &&
      hasSchoolAiCapabilityModules(key, moduleAccess) &&
      !disabledCapabilities.has(key) &&
      capability.roles.includes(role)
    );
  });
}

export function isCapabilityAllowed({
  role,
  config,
  capability,
  moduleAccess,
}: {
  role: string | null;
  config: SchoolAssistantConfig;
  capability: AiCapabilityKey;
  moduleAccess: ResolvedModuleAccess;
}) {
  return getAllowedCapabilities({ role, config, moduleAccess }).includes(capability);
}

export async function assertAssistantToolAccess(
  expected: SchoolAiToolContext,
  input: { toolName: string; capability: AiCapabilityKey },
) {
  const policy = getSchoolAiToolPolicy(input.toolName);
  if (!policy || policy.capability !== input.capability) throw new SchoolAiToolAccessError();
  try {
    const current = await requireDashboardModules(["AI_ASSISTANT", ...policy.modules], CURRENT_RELEASED_CHAT_ROLES);
    if (current.user.id !== expected.userId || current.profile.schoolId !== expected.schoolId ||
      current.user.role !== expected.role || !CURRENT_RELEASED_CHAT_ROLES.includes(current.user.role ?? "") ||
      (current.profile.termId ?? null) !== expected.termId ||
      (current.profile.sessionId ?? null) !== expected.sessionId) {
      throw new SchoolAiToolAccessError("The workspace or account changed. Start a new request.");
    }
    const config = await prisma.schoolAssistantConfig.findFirst({ where: { schoolProfileId: expected.schoolId } });
    if (!config || !isCapabilityAllowed({ role: current.user.role, config,
      moduleAccess: current.access, capability: input.capability })) {
      throw new SchoolAiToolAccessError();
    }
  } catch (error) {
    if (error instanceof DashboardAccessError) throw new SchoolAiToolAccessError();
    throw error;
  }
}

export async function buildConfirmationToken(input: SchoolAiToolConfirmationPayload & { runId: string }) {
  const { runId, ...scope } = input;
  const token = buildSchoolAiConfirmationToken(scope, getConfirmationSecret());
  const payload = readConfirmationToken(token);
  if (!payload) throw new Error("Approval could not be created.");
  await createAssistantConfirmation(prisma, {
    ...payload, runId, tokenDigest: schoolAiConfirmationDigest(token),
    expiresAt: new Date(payload.expiresAt),
  });
  return token;
}

export async function consumeConfirmation(tx: AssistantConfirmationTransaction, input: {
  token: string; payload: SchoolAiSignedConfirmationPayload; runId: string;
}) {
  await consumeAssistantConfirmation(tx, {
    ...input.payload, runId: input.runId,
    tokenDigest: schoolAiConfirmationDigest(input.token),
    expiresAt: new Date(input.payload.expiresAt),
  });
}

export function readConfirmationToken(token: string) {
  return readSchoolAiConfirmationToken(token, getConfirmationSecret());
}

export async function listAssistantConversations(params: {
  schoolId: string;
  userId: string;
  availableTools: string[];
}) {
  const conversations = await withAssistantHistoryList(prisma, params, (tx, ids) => tx.assistantConversation.findMany({
    where: {
      id: { in: ids },
      schoolProfileId: params.schoolId,
      createdByUserId: params.userId,
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: {
      messages: {
        take: 1,
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
      runs: {
        take: 1,
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
  }));

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title || "New conversation",
    status: conversation.status,
    locale: conversation.locale,
    summary: conversation.summary,
    lastMessageAt:
      conversation.lastMessageAt ??
      conversation.updatedAt ??
      conversation.createdAt,
    preview: conversation.messages[0]?.content ?? "",
    lastRunStatus: conversation.runs[0]?.status ?? null,
  }));
}

export async function createAssistantConversation(params: {
  schoolId: string;
  userId: string;
  availableTools: string[];
  title?: string;
  locale?: string;
}) {
  return prisma.assistantConversation.create({
    data: {
      schoolProfileId: params.schoolId,
      createdByUserId: params.userId,
      title: params.title ?? "New conversation",
      locale: params.locale ?? "en",
      lastMessageAt: new Date(),
      meta: assistantHistoryMetadata(params.availableTools),
    },
  });
}

export async function getAssistantConversation(params: {
  conversationId: string;
  schoolId: string;
  userId: string;
  availableTools: string[];
  mode?: "read" | "extend";
}) {
  return withAssistantConversationAccess(prisma, params, (tx) => tx.assistantConversation.findFirst({
    where: {
      id: params.conversationId,
      schoolProfileId: params.schoolId,
      createdByUserId: params.userId,
    },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
      runs: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          toolExecutions: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  }));
}

export async function saveAssistantMessage(params: {
  conversationId: string;
  schoolId: string;
  userId: string;
  availableTools: string[];
  role: "user" | "assistant" | "system";
  content: string;
  parts: AiMessagePart[];
  workflowState?: Record<string, unknown> | null;
}) {
  const created = await withAssistantConversationAccess(prisma, { ...params, mode: "append" }, async (tx) => {
  const message = await tx.assistantMessage.create({
    data: {
      conversationId: params.conversationId,
      schoolProfileId: params.schoolId,
      createdByUserId: params.userId ?? null,
      role: params.role,
      content: params.content,
      parts: params.parts,
      workflowState: params.workflowState ?? undefined,
    },
  });

  await tx.assistantConversation.update({
    where: { id: params.conversationId },
    data: {
      lastMessageAt: new Date(),
      title:
        params.role === "user"
          ? summarizeConversationTitle(params.content)
          : undefined,
      locale:
        params.role === "user" ? detectAiChatLocale(params.content) : undefined,
    },
  });

  return message;
  });
  if (!created) throw new DashboardAccessError(403, "Conversation history is unavailable. Start a new chat.");
  return created;
}

export function assistantMessagesToUiMessages(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: safeJsonParse<AiMessagePart[]>(message.parts, [
      { type: "text", text: message.content ?? "" },
    ]).map((part) => {
      if (part.type === "text") {
        return {
          type: "text" as const,
          text: part.text,
        };
      }

      return {
        type: `tool-${part.toolName}` as const,
        toolCallId: part.toolCallId,
        input: part.input,
        output: part.output,
        state: part.state,
      };
    }),
  }));
}

export async function createAssistantRun(params: {
  conversationId: string;
  schoolId: string;
  userId: string;
  provider?: string | null;
  model?: string | null;
  requestType: string;
  promptSummary?: string | null;
  locale?: string | null;
  workflowAction?: WorkflowAction | null;
}) {
  return prisma.assistantRun.create({
    data: {
      conversationId: params.conversationId,
      schoolProfileId: params.schoolId,
      userId: params.userId,
      provider: params.provider ?? null,
      model: params.model ?? null,
      requestType: params.requestType,
      promptSummary: params.promptSummary ?? null,
      locale: params.locale ?? null,
      workflowAction: params.workflowAction ?? undefined,
    },
  });
}

export async function completeAssistantRun(params: {
  runId: string;
  status: "completed" | "failed" | "cancelled";
  usage?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  error?: string | null;
}) {
  return prisma.assistantRun.update({
    where: { id: params.runId },
    data: {
      status: params.status,
      usage: params.usage ?? undefined,
      metrics: params.metrics ?? undefined,
      error: params.error ?? null,
    },
  });
}

export async function createAssistantToolExecution(params: {
  runId: string;
  conversationId: string;
  schoolId: string;
  toolName: string;
  capability?: string | null;
  isMutation?: boolean;
  input?: unknown;
}) {
  return prisma.assistantToolExecution.create({
    data: {
      runId: params.runId,
      conversationId: params.conversationId,
      schoolProfileId: params.schoolId,
      toolName: params.toolName,
      capability: params.capability ?? null,
      isMutation: params.isMutation ?? false,
      input: params.input ?? undefined,
      startedAt: new Date(),
    },
  });
}

export async function finishAssistantToolExecution(params: {
  toolExecutionId: string;
  status: "completed" | "blocked" | "failed";
  output?: unknown;
  error?: string | null;
}) {
  return prisma.assistantToolExecution.updateMany({
    // A commit acknowledgment can fail after the transaction persisted a receipt.
    // Never overwrite that authoritative completion with a later stream error.
    where: { id: params.toolExecutionId, status: { not: "completed" } },
    data: {
      status: params.status,
      output: params.output ?? undefined,
      error: params.error ?? null,
      completedAt: new Date(),
    },
  });
}

export async function recordAssistantActivity(params: {
  schoolId: string;
  userId: string;
  userName: string;
  type:
    | "assistant_run"
    | "assistant_action_requested"
    | "assistant_action_completed"
    | "assistant_action_blocked";
  title: string;
  description?: string | null;
  meta?: Record<string, unknown>;
}) {
  return prisma.activity.create({
    data: {
      schoolProfileId: params.schoolId,
      userId: params.userId,
      author: params.userName,
      source: "system",
      type: params.type,
      title: params.title,
      description: params.description ?? null,
      meta: params.meta ?? undefined,
    },
  });
}

export async function getAssistantAnalytics(params: {
  schoolId: string;
  userId: string;
  availableTools: string[];
}) {
  const [conversationCount, runCount, failedRuns, toolExecutions, feedback] =
    await withAssistantHistoryList(prisma, params, (tx, ids) => Promise.all([
      tx.assistantConversation.count({
        where: {
          schoolProfileId: params.schoolId,
          id: { in: ids },
          createdByUserId: params.userId,
        },
      }),
      tx.assistantRun.findMany({
        where: {
          conversationId: { in: ids },
          schoolProfileId: params.schoolId,
          userId: params.userId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          toolExecutions: { where: { deletedAt: null, toolName: { in: params.availableTools } } },
        },
      }),
      tx.assistantRun.count({
        where: {
          deletedAt: null,
          conversationId: { in: ids },
          schoolProfileId: params.schoolId,
          userId: params.userId,
          status: "failed",
        },
      }),
      tx.assistantToolExecution.findMany({
        where: {
          conversationId: { in: ids },
          toolName: { in: params.availableTools },
          schoolProfileId: params.schoolId,
          run: {
            userId: params.userId,
            deletedAt: null,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      tx.assistantFeedback.findMany({
        where: {
          conversationId: { in: ids },
          schoolProfileId: params.schoolId,
          userId: params.userId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]));

  const toolUsage = toolExecutions.reduce<Record<string, number>>(
    (acc, execution) => {
      acc[execution.toolName] = (acc[execution.toolName] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const avgRating =
    feedback.length > 0
      ? feedback.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
        feedback.length
      : null;

  const unresolvedDemand = runCount
    .filter(
      (run) =>
        run.status !== "completed" ||
        run.toolExecutions.some((tool) => tool.status !== "completed"),
    )
    .slice(0, 10)
    .map((run) => ({
      id: run.id,
      promptSummary: run.promptSummary,
      status: run.status,
      createdAt: run.createdAt,
      failedTools: run.toolExecutions
        .filter((tool) => tool.status !== "completed")
        .map((tool) => tool.toolName),
    }));

  return {
    conversationCount,
    runCount: runCount.length,
    failedRuns,
    toolUsage,
    avgRating,
    recentRuns: runCount.slice(0, 10).map((run) => ({
      id: run.id,
      status: run.status,
      requestType: run.requestType,
      promptSummary: run.promptSummary,
      createdAt: run.createdAt,
      toolCount: run.toolExecutions.length,
    })),
    unresolvedDemand,
  };
}

export async function saveAssistantFeedback(params: {
  schoolId: string;
  userId: string;
  conversationId?: string | null;
  runId?: string | null;
  rating?: number | null;
  comment?: string | null;
  meta?: Record<string, unknown>;
}) {
  if (params.conversationId) {
    const conversation = await prisma.assistantConversation.findFirst({
      where: { id: params.conversationId, schoolProfileId: params.schoolId, createdByUserId: params.userId },
      select: { id: true },
    });
    if (!conversation) throw new DashboardAccessError(403, "Feedback conversation is unavailable.");
  }
  if (params.runId) {
    const run = await prisma.assistantRun.findFirst({
      where: { id: params.runId, schoolProfileId: params.schoolId, userId: params.userId,
        ...(params.conversationId ? { conversationId: params.conversationId } : {}) },
      select: { id: true },
    });
    if (!run) throw new DashboardAccessError(403, "Feedback run is unavailable.");
  }
  return prisma.assistantFeedback.create({
    data: {
      schoolProfileId: params.schoolId,
      userId: params.userId,
      conversationId: params.conversationId ?? null,
      runId: params.runId ?? null,
      rating: params.rating ?? null,
      comment: params.comment ?? null,
      meta: params.meta ?? undefined,
    },
  });
}

export function parseIncomingChatInput(input: unknown): ChatInput {
  return chatInputSchema.parse(input);
}

export function inputToUserMessage(input: ChatInput) {
  if (input.kind === "text") {
    return {
      content: input.text.trim(),
      locale: detectAiChatLocale(input.text),
      workflowAction: null,
    };
  }

  const content = workflowActionToMessage(input.action);
  return {
    content,
    locale: detectAiChatLocale(content),
    workflowAction: input.action,
  };
}
