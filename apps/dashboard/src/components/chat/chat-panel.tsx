"use client";

import { Button } from "@school-clerk/ui/button";
import { ArrowUp, Bot } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage } from "./chat-message";
import { useSchoolChat } from "./use-school-chat";

const FALLBACK_SUGGESTIONS = [
  "Enroll a student into a classroom",
  "Receive a fee payment",
  "Record a book purchase / issuance",
  "Check a student's balance",
];

export function ChatPanel() {
  const {
    messages,
    activeConversationId,
    isLoading,
    status,
    error,
    capabilities,
    settings,
    sendMessage,
    sendWorkflowAction,
    submitFeedback,
  } = useSchoolChat();

  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions = useMemo(() => {
    if (capabilities.includes("students.enrollment")) {
      return FALLBACK_SUGGESTIONS;
    }

    return [
      "Search for a student",
      "Show recent attendance for a student",
      "Find a staff member",
      "Find a guardian contact",
    ];
  }, [capabilities]);

  const submit = async () => {
    if (!input.trim() || isLoading) return;
    await sendMessage(input.trim());
    setInput("");
    setRows(1);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">School AI</p>
            <p className="text-xs text-muted-foreground">
              {settings?.rolloutStage
                ? `Rollout: ${settings.rolloutStage}`
                : "Operational beta"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">How can I help you?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tenant-aware AI with auditability and role-aware tools.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => void sendMessage(suggestion)}
                  className="rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLoading={
                  isLoading &&
                  index === messages.length - 1 &&
                  message.role === "assistant"
                }
                onWorkflowAction={(action) => void sendWorkflowAction(action)}
                onFeedback={
                  message.role === "assistant"
                    ? (rating) => void submitFeedback(rating)
                    : undefined
                }
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${dot * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error ? (
        <div className="border-t bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="border-t px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>Status: {status}</span>
          <span>{activeConversationId ? "Chat ready" : "Preparing chat"}</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setRows(Math.min(e.target.value.split("\n").length, 4));
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            rows={rows}
            placeholder="Type a task... (Cmd/Ctrl+Enter to send)"
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            dir="auto"
          />
          <Button
            type="button"
            size="icon"
            disabled={isLoading || !input.trim()}
            onClick={() => void submit()}
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
          Mutations require explicit confirmation and are logged with AI run
          metadata.
        </p>
      </div>
    </div>
  );
}
