"use client";

import { useCallback, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatMessagePart =
  | { type: "text"; text: string; state?: "streaming" | "done" }
  | {
      type: "tool-invocation";
      toolName: string;
      toolCallId: string;
      state: "input-available" | "output-available";
      input: unknown;
      output?: unknown;
    };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
};

type Status = "idle" | "loading" | "streaming" | "error";

// ── SSE stream reader for AI SDK v6 UIMessageChunk format ────────────────────

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
          const chunk = JSON.parse(data);
          onChunk(chunk);
        } catch {
          // ignore malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSchoolChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setMessages_ = useCallback(setMessages, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Abort any ongoing request
      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: text.trim() }],
      };

      // Optimistically add user message
      const nextMessages: ChatMessage[] = [...messages, userMessage];
      setMessages_(nextMessages);
      setStatus("loading");
      setError(null);

      // Build UIMessage[] format for v6 API
      const uiMessages = nextMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: m.parts.map((p) => {
          if (p.type === "text") return { type: "text" as const, text: p.text };
          if (p.type === "tool-invocation") {
            if (p.state === "output-available") {
              return {
                type: `tool-${p.toolName}` as const,
                toolCallId: p.toolCallId,
                input: p.input,
                output: p.output,
                state: "output-available" as const,
              };
            }
            return {
              type: `tool-${p.toolName}` as const,
              toolCallId: p.toolCallId,
              input: p.input,
              state: "input-available" as const,
            };
          }
          return { type: "text" as const, text: "" };
        }),
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: uiMessages }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        setStatus("streaming");

        // Build the assistant message incrementally
        const assistantId = `assistant-${Date.now()}`;
        const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", parts: [] };
        const currentToolCalls = new Map<
          string,
          { toolName: string; toolCallId: string; inputText: string }
        >();

        setMessages_((prev) => [...prev, { ...assistantMsg }]);

        await readUIStream(
          res.body,
          (chunk) => {
            setMessages_((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantId);
              if (idx === -1) return prev;
              const updated = { ...prev[idx], parts: [...prev[idx].parts] };

              const type = chunk.type as string;

              if (type === "text-start") {
                updated.parts = [
                  ...updated.parts,
                  { type: "text", text: "", state: "streaming" as const },
                ];
              } else if (type === "text-delta") {
                const lastIdx = updated.parts.length - 1;
                const last = updated.parts[lastIdx];
                if (last?.type === "text") {
                  updated.parts = [
                    ...updated.parts.slice(0, lastIdx),
                    { ...last, text: last.text + (chunk.delta as string) },
                  ];
                }
              } else if (type === "text-end") {
                const lastIdx = updated.parts.length - 1;
                const last = updated.parts[lastIdx];
                if (last?.type === "text") {
                  updated.parts = [
                    ...updated.parts.slice(0, lastIdx),
                    { ...last, state: "done" as const },
                  ];
                }
              } else if (type === "tool-input-start") {
                const toolCallId = chunk.toolCallId as string;
                const toolName = chunk.toolName as string;
                currentToolCalls.set(toolCallId, { toolName, toolCallId, inputText: "" });
              } else if (type === "tool-input-delta") {
                const toolCallId = chunk.toolCallId as string;
                const tc = currentToolCalls.get(toolCallId);
                if (tc) {
                  tc.inputText += chunk.inputTextDelta as string;
                }
              } else if (type === "tool-input-available") {
                const toolCallId = chunk.toolCallId as string;
                const tc = currentToolCalls.get(toolCallId);
                const toolName = (tc?.toolName ?? chunk.toolName) as string;
                let input: unknown = {};
                try {
                  input = JSON.parse(tc?.inputText || "{}");
                } catch {
                  input = {};
                }
                updated.parts = [
                  ...updated.parts,
                  {
                    type: "tool-invocation" as const,
                    toolName,
                    toolCallId,
                    state: "input-available" as const,
                    input,
                  },
                ];
              } else if (type === "tool-output-available") {
                const toolCallId = chunk.toolCallId as string;
                const partIdx = updated.parts.findIndex(
                  (p) =>
                    p.type === "tool-invocation" && (p as any).toolCallId === toolCallId,
                );
                if (partIdx !== -1) {
                  const part = updated.parts[partIdx] as Extract<
                    ChatMessagePart,
                    { type: "tool-invocation" }
                  >;
                  updated.parts = [
                    ...updated.parts.slice(0, partIdx),
                    { ...part, state: "output-available" as const, output: chunk.output },
                    ...updated.parts.slice(partIdx + 1),
                  ];
                }
              }

              const next = [...prev];
              next[idx] = updated;
              return next;
            });
          },
          () => {
            setStatus("idle");
          },
        );
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          setStatus("idle");
          return;
        }
        const msg = err instanceof Error ? err.message : "An error occurred";
        setError(msg);
        setStatus("error");
      }
    },
    [messages, setMessages_],
  );

  const append = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages_([]);
    setStatus("idle");
    setError(null);
  }, [setMessages_]);

  const isLoading = status === "loading" || status === "streaming";

  return {
    messages,
    status,
    error,
    isLoading,
    sendMessage,
    append,
    clearMessages,
  };
}
