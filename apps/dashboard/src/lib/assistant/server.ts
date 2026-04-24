import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { getSession } from "@/auth/server";
import {
  type AssistantConversation,
  type AssistantFeedback,
  type AssistantMessage,
  type AssistantRun,
  type AssistantToolExecution,
  type SchoolAssistantConfig,
  prisma,
} from "@school-clerk/db";

import {
  assistantCapabilities,
  assistantCapabilityMap,
  chatInputSchema,
  detectAssistantLocale,
  safeJsonParse,
  summarizeConversationTitle,
  workflowActionToMessage,
  type AssistantCapabilityKey,
  type AssistantMessagePart,
  type ChatInput,
  type WorkflowAction,
} from "./shared";

const DEFAULT_ALLOWED_ROLES = ["Admin", "Registrar", "Accountant", "Teacher", "Staff"];
const DEFAULT_ROLLOUT_STAGE = "beta";

function getConfirmationSecret() {
  return process.env.BETTER_AUTH_SECRET || "school-clerk-assistant";
}

export async function getAssistantSessionContext() {
  const [profile, session] = await Promise.all([getAuthCookie(), getSession()]);
  const user = session?.user;

  if (!profile?.schoolId || !profile.auth?.userId || !user?.id) {
    return null;
  }

  return {
    schoolId: profile.schoolId,
    termId: profile.termId ?? null,
    sessionId: profile.sessionId ?? null,
    userId: user.id,
    role: ((user as { role?: string | null }).role ?? null) as string | null,
    userName: user.name ?? "School Clerk User",
    userEmail: user.email ?? null,
  };
}

export async function ensureAssistantConfig(schoolId: string) {
  const existing = await prisma.schoolAssistantConfig.findFirst({
    where: { schoolProfileId: schoolId },
  });

  if (existing) return existing;

  return prisma.schoolAssistantConfig.create({
    data: {
      schoolProfileId: schoolId,
      allowedRoles: DEFAULT_ALLOWED_ROLES,
      enabledCapabilities: assistantCapabilities.map((cap) => cap.key),
      rolloutStage: DEFAULT_ROLLOUT_STAGE,
    },
  });
}

export function getAllowedCapabilities({
  role,
  config,
}: {
  role: string | null;
  config: SchoolAssistantConfig;
}) {
  const allowedRoles = safeJsonParse<string[]>(config.allowedRoles, DEFAULT_ALLOWED_ROLES);
  const enabledCapabilities = safeJsonParse<AssistantCapabilityKey[]>(
    config.enabledCapabilities,
    assistantCapabilities.map((cap) => cap.key),
  );
  const disabledCapabilities = new Set(
    safeJsonParse<AssistantCapabilityKey[]>(config.disabledCapabilities, []),
  );

  if (!config.enabled || !role || !allowedRoles.includes(role)) {
    return [] as AssistantCapabilityKey[];
  }

  return enabledCapabilities.filter((key) => {
    const capability = assistantCapabilityMap[key];
    return capability && !disabledCapabilities.has(key) && capability.roles.includes(role);
  });
}

export function isCapabilityAllowed({
  role,
  config,
  capability,
}: {
  role: string | null;
  config: SchoolAssistantConfig;
  capability: AssistantCapabilityKey;
}) {
  return getAllowedCapabilities({ role, config }).includes(capability);
}

export function buildConfirmationToken(input: {
  conversationId: string;
  schoolId: string;
  toolName: string;
  actionInput: Record<string, unknown>;
}) {
  const payload = JSON.stringify(input);
  const sig = createHmac("sha256", getConfirmationSecret()).update(payload).digest("hex");
  return Buffer.from(
    JSON.stringify({
      payload,
      sig,
    }),
  ).toString("base64url");
}

export function readConfirmationToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      payload: string;
      sig: string;
    };
    const expected = createHmac("sha256", getConfirmationSecret())
      .update(decoded.payload)
      .digest("hex");
    const valid = timingSafeEqual(Buffer.from(decoded.sig), Buffer.from(expected));
    if (!valid) return null;
    return JSON.parse(decoded.payload) as {
      conversationId: string;
      schoolId: string;
      toolName: string;
      actionInput: Record<string, unknown>;
    };
  } catch {
    return null;
  }
}

export async function listAssistantConversations(params: {
  schoolId: string;
  userId: string;
}) {
  const conversations = await prisma.assistantConversation.findMany({
    where: {
      schoolProfileId: params.schoolId,
      createdByUserId: params.userId,
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: {
      messages: {
        take: 1,
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
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title || "New conversation",
    status: conversation.status,
    locale: conversation.locale,
    summary: conversation.summary,
    lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
    preview: conversation.messages[0]?.content ?? "",
    lastRunStatus: conversation.runs[0]?.status ?? null,
  }));
}

export async function createAssistantConversation(params: {
  schoolId: string;
  userId: string;
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
    },
  });
}

export async function getAssistantConversation(params: {
  conversationId: string;
  schoolId: string;
  userId: string;
}) {
  return prisma.assistantConversation.findFirst({
    where: {
      id: params.conversationId,
      schoolProfileId: params.schoolId,
      createdByUserId: params.userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          toolExecutions: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
}

export async function saveAssistantMessage(params: {
  conversationId: string;
  schoolId: string;
  userId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  parts: AssistantMessagePart[];
  workflowState?: Record<string, unknown> | null;
}) {
  const created = await prisma.assistantMessage.create({
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

  await prisma.assistantConversation.update({
    where: { id: params.conversationId },
    data: {
      lastMessageAt: new Date(),
      title:
        params.role === "user"
          ? summarizeConversationTitle(params.content)
          : undefined,
      locale:
        params.role === "user" ? detectAssistantLocale(params.content) : undefined,
    },
  });

  return created;
}

export function assistantMessagesToUiMessages(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: safeJsonParse<AssistantMessagePart[]>(message.parts, [
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
  return prisma.assistantToolExecution.update({
    where: { id: params.toolExecutionId },
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
}) {
  const [conversationCount, runCount, failedRuns, toolExecutions, feedback] =
    await Promise.all([
      prisma.assistantConversation.count({
        where: {
          schoolProfileId: params.schoolId,
          createdByUserId: params.userId,
        },
      }),
      prisma.assistantRun.findMany({
        where: {
          schoolProfileId: params.schoolId,
          userId: params.userId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          toolExecutions: true,
        },
      }),
      prisma.assistantRun.count({
        where: {
          schoolProfileId: params.schoolId,
          userId: params.userId,
          status: "failed",
        },
      }),
      prisma.assistantToolExecution.findMany({
        where: {
          schoolProfileId: params.schoolId,
          run: {
            userId: params.userId,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.assistantFeedback.findMany({
        where: {
          schoolProfileId: params.schoolId,
          userId: params.userId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  const toolUsage = toolExecutions.reduce<Record<string, number>>((acc, execution) => {
    acc[execution.toolName] = (acc[execution.toolName] ?? 0) + 1;
    return acc;
  }, {});

  const avgRating =
    feedback.length > 0
      ? feedback.reduce((sum, item) => sum + (item.rating ?? 0), 0) / feedback.length
      : null;

  const unresolvedDemand = runCount
    .filter((run) => run.status !== "completed" || run.toolExecutions.some((tool) => tool.status !== "completed"))
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
      locale: detectAssistantLocale(input.text),
      workflowAction: null,
    };
  }

  const content = workflowActionToMessage(input.action);
  return {
    content,
    locale: detectAssistantLocale(content),
    workflowAction: input.action,
  };
}
