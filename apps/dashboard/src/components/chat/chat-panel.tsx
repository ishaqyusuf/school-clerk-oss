"use client";

import { Button } from "@school-clerk/ui/button";
import { ArrowUp, Bot, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./chat-message";
import { useSchoolChat } from "./use-school-chat";

const SUGGESTIONS = [
  "Enroll a student into a classroom",
  "Receive a fee payment",
  "Record a book purchase / issuance",
  "Check a student's balance",
];

export function ChatPanel() {
  const { messages, isLoading, sendMessage, append, clearMessages } = useSchoolChat();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const lineCount = e.target.value.split("\n").length;
    setRows(Math.min(lineCount, 4));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
    setRows(1);
  };

  const onAppend = (content: string) => {
    append(content);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">School Assistant</p>
            <p className="text-xs text-muted-foreground">
              {process.env.NEXT_PUBLIC_AI_PROVIDER === "openai"
                ? "GPT-4o"
                : process.env.NEXT_PUBLIC_AI_PROVIDER === "gemini"
                  ? "Gemini"
                  : "Claude"}
            </p>
          </div>
        </div>
        {!isEmpty && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">How can I help you?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete school admin tasks in natural language. Arabic supported.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    sendMessage(s);
                  }}
                  className="rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLoading={
                  isLoading && i === messages.length - 1 && msg.role === "assistant"
                }
                onAppend={onAppend}
              />
            ))}
            {/* Loading dots when waiting for assistant response */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder="Type a task… (⌘+Enter to send)"
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            dir="auto"
          />
          <Button
            type="button"
            size="icon"
            disabled={isLoading || !input.trim()}
            onClick={submit}
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
          Actions are executed immediately — review before confirming.
        </p>
      </div>
    </div>
  );
}
