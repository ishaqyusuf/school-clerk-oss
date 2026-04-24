"use client";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { ArrowUp, Bot, History, LineChart, Plus, RotateCcw, Settings2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage } from "./chat-message";
import { useSchoolChat } from "./use-school-chat";

const FALLBACK_SUGGESTIONS = [
  "Enroll a student into a classroom",
  "Receive a fee payment",
  "Record a book purchase / issuance",
  "Check a student's balance",
];

type PanelView = "chat" | "history" | "insights" | "settings";

export function ChatPanel() {
  const {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    status,
    error,
    capabilities,
    settings,
    analytics,
    topTools,
    sendMessage,
    sendWorkflowAction,
    createConversation,
    selectConversation,
    submitFeedback,
    saveSettings,
  } = useSchoolChat();

  const [input, setInput] = useState("");
  const [rows, setRows] = useState(1);
  const [view, setView] = useState<PanelView>("chat");
  const [localSettings, setLocalSettings] = useState({
    enabled: true,
    preferredProvider: "",
    preferredModel: "",
    analyticsEnabled: true,
    feedbackEnabled: true,
    maxSteps: 5,
    allowedRoles: ["Admin", "Registrar", "Accountant", "Teacher", "Staff"],
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  useEffect(() => {
    if (!settings) return;
    setLocalSettings({
      enabled: settings.enabled,
      preferredProvider: settings.preferredProvider ?? "",
      preferredModel: settings.preferredModel ?? "",
      analyticsEnabled: settings.analyticsEnabled,
      feedbackEnabled: settings.feedbackEnabled,
      maxSteps: settings.maxSteps,
      allowedRoles: settings.allowedRoles ?? [
        "Admin",
        "Registrar",
        "Accountant",
        "Teacher",
        "Staff",
      ],
    });
  }, [settings]);

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

  const saveAssistantSettings = async () => {
    if (!settings) return;
    await saveSettings({
      ...settings,
      enabled: localSettings.enabled,
      preferredProvider: localSettings.preferredProvider || null,
      preferredModel: localSettings.preferredModel || null,
      analyticsEnabled: localSettings.analyticsEnabled,
      feedbackEnabled: localSettings.feedbackEnabled,
      maxSteps: localSettings.maxSteps,
      allowedRoles: localSettings.allowedRoles,
      enabledCapabilities: settings.enabledCapabilities ?? capabilities,
      disabledCapabilities: settings.disabledCapabilities ?? [],
      systemPromptExtra: settings.systemPromptExtra ?? null,
      rolloutStage: settings.rolloutStage ?? "beta",
    });
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
            <p className="text-sm font-semibold">School Assistant</p>
            <p className="text-xs text-muted-foreground">
              {settings?.rolloutStage ? `Rollout: ${settings.rolloutStage}` : "Operational beta"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={view === "chat" ? "secondary" : "ghost"} size="icon" onClick={() => setView("chat")}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "history" ? "secondary" : "ghost"} size="icon" onClick={() => setView("history")}>
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "insights" ? "secondary" : "ghost"} size="icon" onClick={() => setView("insights")}>
            <LineChart className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "settings" ? "secondary" : "ghost"} size="icon" onClick={() => setView("settings")}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {view === "history" ? (
          <div className="flex flex-col gap-3">
            <Button className="w-full" variant="outline" onClick={() => void createConversation()}>
              <Plus className="mr-2 h-4 w-4" />
              New conversation
            </Button>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  selectConversation(conversation.id);
                  setView("chat");
                }}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  activeConversationId === conversation.id
                    ? "border-primary/30 bg-primary/5"
                    : "bg-card hover:bg-accent",
                ].join(" ")}
              >
                <p className="text-sm font-medium">{conversation.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {conversation.preview || "No messages yet."}
                </p>
              </button>
            ))}
          </div>
        ) : null}

        {view === "insights" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">Conversations</p>
                <p className="text-lg font-semibold">{analytics?.conversationCount ?? 0}</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">Runs</p>
                <p className="text-lg font-semibold">{analytics?.runCount ?? 0}</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">Failed runs</p>
                <p className="text-lg font-semibold">{analytics?.failedRuns ?? 0}</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs text-muted-foreground">Avg rating</p>
                <p className="text-lg font-semibold">
                  {analytics?.avgRating ? analytics.avgRating.toFixed(1) : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3">
              <p className="text-sm font-medium">Top tools</p>
              <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground">
                {topTools.length ? (
                  topTools.map(([tool, count]) => (
                    <div key={tool} className="flex items-center justify-between">
                      <span>{tool}</span>
                      <span>{count}</span>
                    </div>
                  ))
                ) : (
                  <p>No tool usage yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3">
              <p className="text-sm font-medium">Unresolved demand</p>
              <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground">
                {analytics?.unresolvedDemand?.length ? (
                  analytics.unresolvedDemand.map((item) => (
                    <div key={item.id} className="rounded-lg border px-3 py-2">
                      <p className="font-medium text-foreground">{item.promptSummary || "Untitled run"}</p>
                      <p className="mt-1">Status: {item.status}</p>
                      <p>Failed tools: {item.failedTools.join(", ") || "None recorded"}</p>
                    </div>
                  ))
                ) : (
                  <p>No unresolved demand captured yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {view === "settings" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-sm font-medium">Assistant controls</p>
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Enabled</span>
                  <input
                    type="checkbox"
                    checked={localSettings.enabled}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Analytics</span>
                  <input
                    type="checkbox"
                    checked={localSettings.analyticsEnabled}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        analyticsEnabled: e.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Feedback</span>
                  <input
                    type="checkbox"
                    checked={localSettings.feedbackEnabled}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        feedbackEnabled: e.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Preferred provider</span>
                  <Input
                    value={localSettings.preferredProvider}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        preferredProvider: e.target.value,
                      }))
                    }
                    placeholder="anthropic | openai | gemini"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Preferred model</span>
                  <Input
                    value={localSettings.preferredModel}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        preferredModel: e.target.value,
                      }))
                    }
                    placeholder="Optional model override"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Max steps</span>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={localSettings.maxSteps}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        maxSteps: Number(e.target.value || 5),
                      }))
                    }
                  />
                </label>
              </div>
              <Button className="mt-4 w-full" onClick={() => void saveAssistantSettings()}>
                Save settings
              </Button>
            </div>

            <div className="rounded-xl border bg-card p-3">
              <p className="text-sm font-medium">Available capabilities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {capabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {view === "chat" ? (
          isEmpty ? (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">How can I help you?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tenant-aware assistant with history, auditability, and role-aware tools.
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
                  isLoading={isLoading && index === messages.length - 1 && message.role === "assistant"}
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
          )
        ) : null}
      </div>

      {error ? (
        <div className="border-t bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="border-t px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground/70">
          <span>Status: {status}</span>
          <span>{activeConversationId ? "Conversation active" : "No conversation yet"}</span>
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
            disabled={isLoading || view !== "chat"}
            className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            dir="auto"
          />
          <Button
            type="button"
            size="icon"
            disabled={isLoading || !input.trim() || view !== "chat"}
            onClick={() => void submit()}
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
          Mutations require explicit confirmation and are logged with assistant run metadata.
        </p>
      </div>
    </div>
  );
}
