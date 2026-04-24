"use client";

import type {
  AssistantMessagePart,
  WorkflowAction,
} from "@/lib/assistant/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: AssistantMessagePart[];
  content?: string | null;
  createdAt?: string | null;
};

export type ConversationListItem = {
  id: string;
  title: string;
  status: string;
  locale: string | null;
  summary: string | null;
  lastMessageAt: string | null;
  preview: string;
  lastRunStatus: string | null;
};

export type AssistantAnalytics = {
  conversationCount: number;
  runCount: number;
  failedRuns: number;
  toolUsage: Record<string, number>;
  avgRating: number | null;
  recentRuns: {
    id: string;
    status: string;
    requestType: string | null;
    promptSummary: string | null;
    createdAt: string | null;
    toolCount: number;
  }[];
  unresolvedDemand: {
    id: string;
    promptSummary: string | null;
    status: string;
    createdAt: string | null;
    failedTools: string[];
  }[];
};

export type AssistantSettings = {
  enabled: boolean;
  preferredProvider?: string | null;
  preferredModel?: string | null;
  allowedRoles?: string[] | null;
  enabledCapabilities?: string[] | null;
  disabledCapabilities?: string[] | null;
  analyticsEnabled: boolean;
  feedbackEnabled: boolean;
  maxSteps: number;
  systemPromptExtra?: string | null;
  rolloutStage?: string | null;
};

type Status = "idle" | "loading" | "streaming" | "error";

async function readUIStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: Record<string, unknown>) => void,
  onDone: () => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;
        try {
          onChunk(JSON.parse(data));
        } catch {
          // Ignore malformed SSE chunks.
        }
      }
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}

export function useSchoolChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [analytics, setAnalytics] = useState<AssistantAnalytics | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/chat/conversations", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load conversations.");
    const data = (await res.json()) as {
      conversations: ConversationListItem[];
      capabilities: string[];
      config: AssistantSettings;
    };
    setConversations(data.conversations);
    setCapabilities(data.capabilities);
    setSettings((prev) => ({ ...(prev ?? {}), ...data.config }));

    if (!activeConversationId && data.conversations[0]?.id) {
      setActiveConversationId(data.conversations[0].id);
    }
    return data.conversations;
  }, [activeConversationId]);

  const refreshAnalytics = useCallback(async () => {
    const res = await fetch("/api/chat/analytics", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { analytics: AssistantAnalytics };
    setAnalytics(data.analytics);
  }, []);

  const refreshSettings = useCallback(async () => {
    const res = await fetch("/api/chat/settings", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      config: AssistantSettings;
    };
    setSettings(data.config);
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/chat/conversations/${conversationId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load conversation.");
    const data = (await res.json()) as {
      conversation: {
        messages: ChatMessage[];
        runs: { id: string }[];
      };
    };
    setMessages(data.conversation.messages);
    setLastRunId(data.conversation.runs[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void refreshConversations();
    void refreshSettings();
    void refreshAnalytics();
  }, [refreshAnalytics, refreshConversations, refreshSettings]);

  useEffect(() => {
    if (!activeConversationId) return;
    void loadConversation(activeConversationId);
  }, [activeConversationId, loadConversation]);

  const createConversation = useCallback(async () => {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed to create conversation.");
    const data = (await res.json()) as { conversation: { id: string } };
    await refreshConversations();
    setActiveConversationId(data.conversation.id);
    setMessages([]);
    setLastRunId(null);
    return data.conversation.id;
  }, [refreshConversations]);

  const persistAssistantMessage = useCallback(
    async (conversationId: string, message: ChatMessage) => {
      await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: message.role,
          content:
            message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("") || message.content ||
            "",
          parts: message.parts,
        }),
      });
    },
    [],
  );

  const sendInput = useCallback(
    async (
      input:
        | {
            kind: "text";
            text: string;
          }
        | {
            kind: "workflow";
            action: WorkflowAction;
          },
    ) => {
      const text =
        input.kind === "text"
          ? input.text.trim()
          : input.action.type === "confirm-tool"
            ? input.action.summary
            : input.action.type === "confirm-payment"
              ? `Confirm payment for ${input.action.studentName}`
              : input.action.type === "select-student"
                ? `Selected ${input.action.studentName}`
                : `Selected ${input.action.classroomName}`;

      if (!text) return;

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      let conversationId = activeConversationId;
      if (!conversationId) {
        conversationId = await createConversation();
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text, state: "done" }],
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus("loading");
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            input,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        const runId = res.headers.get("x-school-clerk-run-id");
        if (runId) setLastRunId(runId);

        setStatus("streaming");

        const assistantId = `assistant-${Date.now()}`;
        const currentToolCalls = new Map<
          string,
          { toolName: string; toolCallId: string; inputText: string }
        >();
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: "assistant",
          parts: [],
        };

        setMessages((prev) => [...prev, assistantMsg]);

        await readUIStream(
          res.body,
          (chunk) => {
            setMessages((prev) => {
              const index = prev.findIndex((m) => m.id === assistantId);
              if (index === -1) return prev;

              const updated = { ...prev[index], parts: [...prev[index].parts] };
              const type = chunk.type as string;

              if (type === "text-start") {
                updated.parts.push({ type: "text", text: "", state: "streaming" });
              } else if (type === "text-delta") {
                const last = updated.parts[updated.parts.length - 1];
                if (last?.type === "text") {
                  last.text += String(chunk.delta ?? "");
                }
              } else if (type === "text-end") {
                const last = updated.parts[updated.parts.length - 1];
                if (last?.type === "text") {
                  last.state = "done";
                }
              } else if (type === "tool-input-start") {
                currentToolCalls.set(String(chunk.toolCallId), {
                  toolName: String(chunk.toolName),
                  toolCallId: String(chunk.toolCallId),
                  inputText: "",
                });
              } else if (type === "tool-input-delta") {
                const call = currentToolCalls.get(String(chunk.toolCallId));
                if (call) {
                  call.inputText += String(chunk.inputTextDelta ?? "");
                }
              } else if (type === "tool-input-available") {
                const call = currentToolCalls.get(String(chunk.toolCallId));
                let inputValue: unknown = {};
                try {
                  inputValue = JSON.parse(call?.inputText || "{}");
                } catch {
                  inputValue = {};
                }
                updated.parts.push({
                  type: "tool-invocation",
                  toolName: call?.toolName ?? String(chunk.toolName),
                  toolCallId: String(chunk.toolCallId),
                  state: "input-available",
                  input: inputValue,
                });
              } else if (type === "tool-output-available") {
                const partIndex = updated.parts.findIndex(
                  (part) =>
                    part.type === "tool-invocation" &&
                    part.toolCallId === String(chunk.toolCallId),
                );
                if (partIndex !== -1) {
                  const part = updated.parts[partIndex];
                  if (part.type === "tool-invocation") {
                    updated.parts[partIndex] = {
                      ...part,
                      state: "output-available",
                      output: chunk.output,
                    };
                  }
                }
              }

              const next = [...prev];
              next[index] = updated;
              assistantMsg.parts = updated.parts;
              assistantMsg.content = updated.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("");
              return next;
            });
          },
          () => {
            setStatus("idle");
          },
        );

        if (assistantMsg.parts.length > 0) {
          await persistAssistantMessage(conversationId, assistantMsg);
        }

        await refreshConversations();
        await refreshAnalytics();
        await loadConversation(conversationId);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setError(err instanceof Error ? err.message : "An error occurred");
        setStatus("error");
      }
    },
    [
      activeConversationId,
      createConversation,
      loadConversation,
      persistAssistantMessage,
      refreshAnalytics,
      refreshConversations,
    ],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      await sendInput({ kind: "text", text });
    },
    [sendInput],
  );

  const sendWorkflowAction = useCallback(
    async (action: WorkflowAction) => {
      await sendInput({ kind: "workflow", action });
    },
    [sendInput],
  );

  const submitFeedback = useCallback(
    async (rating: number, comment?: string) => {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          runId: lastRunId,
          rating,
          comment: comment ?? null,
        }),
      });
      await refreshAnalytics();
    },
    [activeConversationId, lastRunId, refreshAnalytics],
  );

  const saveSettings = useCallback(async (nextSettings: AssistantSettings) => {
    const res = await fetch("/api/chat/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSettings),
    });
    if (!res.ok) throw new Error("Failed to save assistant settings.");
    const data = (await res.json()) as { config: AssistantSettings };
    setSettings(data.config);
    await refreshConversations();
  }, [refreshConversations]);

  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const isLoading = status === "loading" || status === "streaming";
  const topTools = useMemo(
    () =>
      analytics
        ? Object.entries(analytics.toolUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
        : [],
    [analytics],
  );

  return {
    messages,
    conversations,
    activeConversationId,
    status,
    error,
    isLoading,
    capabilities,
    settings,
    analytics,
    topTools,
    lastRunId,
    sendMessage,
    sendWorkflowAction,
    createConversation,
    selectConversation,
    refreshConversations,
    refreshAnalytics,
    saveSettings,
    submitFeedback,
  };
}
