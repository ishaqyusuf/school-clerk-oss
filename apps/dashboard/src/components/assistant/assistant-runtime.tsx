"use client";
import { useQuickAssistantStore } from "@/store/quick-assistant";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Textarea } from "@school-clerk/ui/textarea";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@school-clerk/ui/sheet";
import {
	ArrowUp,
	Square,
	Plus,
	Maximize2,
	Minus,
	History,
	Settings,
	RefreshCw,
	Sparkles,
	X,
	Bookmark,
	Paperclip,
} from "lucide-react";
import { useAssistantController } from "./use-assistant-controller";
import { AssistantResult, ResultDetails } from "./assistant-results";
import { AssistantFiles } from "./assistant-files";
import { AssistantExports } from "./assistant-exports";
import { AssistantSettings } from "./assistant-settings";
import { AssistantAttachments } from "./assistant-attachments";
import { AssistantAnswer } from "./assistant-answer";
export function AssistantRuntime() {
	const c = useAssistantController();
	const { state } = c;
	const router = useRouter();
	const params = useSearchParams();
	const [historyOpen, setHistoryOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [archived, setArchived] = useState(false);
	const [cursor, setCursor] = useState<string | undefined>();
	const [artifact, setArtifact] = useState<unknown>(null);
	const [artifactId, setArtifactId] = useState<string | null>(null);
	const [receiptsOpen, setReceiptsOpen] = useState(false);
	const [savedOpen, setSavedOpen] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	const list = useQuery(
		c.trpc.assistant.list.queryOptions(
			{ search, archived, cursor },
			{ enabled: historyOpen },
		),
	);
	const receipts = useQuery(
		c.trpc.assistant.receipts.queryOptions(
			{ conversationId: state.conversationId ?? "" },
			{ enabled: receiptsOpen && !!state.conversationId },
		),
	);
	const preferences = useQuery(c.trpc.assistant.preferences.queryOptions());
	const end = useRef<HTMLDivElement>(null);
	const composer = useRef<HTMLTextAreaElement>(null);
	const scroll = useRef<HTMLDivElement>(null);
	const sticky = useRef(true);
	useEffect(() => {
		if (
			state.target &&
			params.get("chat") &&
			params.get("chat") !== useQuickAssistantStore.getState().conversationId &&
			!c.busy
		)
			state.set({ conversationId: params.get("chat") });
	}, [state.target, params, c.busy, state.set]);
	useEffect(() => {
		if (state.opened || state.target) composer.current?.focus();
	}, [state.opened, state.target]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Scroll follows new stream content and status.
	useEffect(() => {
		if (sticky.current && (state.opened || state.target))
			end.current?.scrollIntoView({ block: "end" });
	}, [c.chat.messages, c.busy, state.opened, state.target]);
	useEffect(() => {
		const listener = (event: KeyboardEvent) => {
			if (
				event.key === "Escape" &&
				!event.defaultPrevented &&
				!document.querySelector('[data-state="open"][role="dialog"]') &&
				!state.target
			) {
				state.minimize();
				document
					.querySelector<HTMLButtonElement>(
						'[aria-label="Open quick Assistant"]',
					)
					?.focus();
			}
		};
		document.addEventListener("keydown", listener);
		return () => document.removeEventListener("keydown", listener);
	}, [state.target, state.minimize]);
	useEffect(() => {
		if (state.target && state.conversationId && !params.get("chat"))
			window.history.replaceState(
				null,
				"",
				`/assistant?chat=${encodeURIComponent(state.conversationId)}`,
			);
	}, [state.target, state.conversationId, params]);
	useEffect(() => {
		if (!state.target) return;
		const id = params.get("artifact");
		setArtifactId(id);
		if (!id) {
			setArtifact(null);
			return;
		}
		const part = c.chat.messages
			.flatMap((message) => message.parts)
			.find(
				(part) =>
					"toolCallId" in part && part.toolCallId === id && "output" in part,
			);
		if (part && "output" in part) setArtifact(part.output);
	}, [params, c.chat.messages, state.target]);
	function openResult(value: unknown, id: string) {
		setArtifact(value);
		setArtifactId(id);
		if (state.target && state.conversationId) {
			const query = new URLSearchParams({
				chat: state.conversationId,
				artifact: id,
			});
			router.replace(`/assistant?${query}`, { scroll: false });
		}
	}
	function closeResult() {
		setArtifact(null);
		setArtifactId(null);
		if (state.target) {
			const query = new URLSearchParams(params.toString());
			query.delete("artifact");
			router.replace(`/assistant?${query}`, { scroll: false });
		}
	}
	const select = (id: string) => {
		if (c.busy) return;
		state.set({ conversationId: id, records: [], attachmentIds: [] });
		setArtifact(null);
		setArtifactId(null);
		if (state.target)
			router.replace(`/assistant?chat=${encodeURIComponent(id)}`);
		setHistoryOpen(false);
	};
	const reset = () => {
		setArtifact(null);
		setArtifactId(null);
		c.newChat();
		if (state.target) router.replace("/assistant");
	};
	const saved = Array.isArray(preferences.data?.savedPrompts)
		? (preferences.data.savedPrompts as {
				id: string;
				title: string;
				text: string;
			}[])
		: [];
	async function savePrompt() {
		if (!state.draft.trim()) return;
		try {
			await c.api.assistant.savePreferences.mutate({
				locale: (preferences.data?.locale ?? "auto") as "auto" | "en" | "ar",
				savedPrompts: [
					...saved,
					{
						id: crypto.randomUUID(),
						title: state.draft.slice(0, 70),
						text: state.draft,
					},
				].slice(-30),
			});
			await preferences.refetch();
			setSavedOpen(true);
		} catch (e) {
			c.setError(e instanceof Error ? e.message : "Unable to save prompt.");
		}
	}
	const content = (
		<div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
			<div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b px-3">
				<div className="flex items-center gap-2">
					<Sparkles className="size-4" />
					<span className="text-sm font-medium">School Assistant</span>
				</div>
				<div className="flex items-center">
					<Button
						size="icon"
						variant="ghost"
						aria-label="New chat"
						disabled={c.busy}
						onClick={reset}
					>
						<Plus className="size-4" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						aria-label="Recent chats"
						onClick={() => setHistoryOpen(true)}
					>
						<History className="size-4" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						aria-label="Assistant settings"
						onClick={() => setSettingsOpen(true)}
					>
						<Settings className="size-4" />
					</Button>
					{!state.target && (
						<>
							<Button
								size="icon"
								variant="ghost"
								aria-label="Expand Assistant"
								onClick={() => {
									state.set({ opened: false });
									router.push(
										state.conversationId
											? `/assistant?chat=${state.conversationId}${artifactId ? `&artifact=${encodeURIComponent(artifactId)}` : ""}`
											: "/assistant",
									);
								}}
							>
								<Maximize2 className="size-4" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								aria-label="Minimize Assistant"
								onClick={state.minimize}
							>
								<Minus className="size-4" />
							</Button>
						</>
					)}
				</div>
			</div>
			<div
				ref={scroll}
				onScroll={() => {
					const el = scroll.current;
					if (el)
						sticky.current =
							el.scrollHeight - el.scrollTop - el.clientHeight < 90;
				}}
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5"
			>
				<div className="mx-auto w-full max-w-3xl space-y-5">
					{c.bootstrap.isPending ? (
						<output className="text-sm text-muted-foreground">
							Loading your school workspace…
						</output>
					) : c.bootstrap.isError ? (
						<div role="alert" className="rounded-lg border p-4">
							<p className="text-sm">
								Assistant is unavailable. Check school access or enable it in
								settings.
							</p>
							<Button
								variant="outline"
								className="mt-3"
								onClick={() => setSettingsOpen(true)}
							>
								Open settings
							</Button>
						</div>
					) : null}
					{!c.chat.messages.length &&
						!state.records.length &&
						!c.bootstrap.isError && (
							<div className="py-12">
								<p className="text-xs uppercase tracking-widest text-muted-foreground">
									Your school, in context
								</p>
								<h2 className="mt-3 text-2xl font-semibold tracking-tight">
									What would you like to get done?
								</h2>
								<p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
									Find records, check balances, and prepare school actions. You
									review changes before they are saved.
								</p>
								<div className="mt-6 flex flex-wrap gap-2">
									{[
										["students.read", "Find a student"],
										["finance.read", "Check a student’s fee balance"],
										["inventory.read", "Show low-stock items"],
									]
										.filter(([cap]) =>
											c.bootstrap.data?.capabilities.includes(cap as never),
										)
										.map(([, text]) => (
											<Button
												key={text}
												variant="outline"
												onClick={() => state.set({ draft: text })}
											>
												{text}
											</Button>
										))}
								</div>
							</div>
						)}
					{!c.bootstrap.isError &&
						c.chat.messages.map((message) => (
							<article
								key={message.id}
								dir="auto"
								className={
									message.role === "user"
										? "ml-auto max-w-[88%] rounded-xl bg-muted p-3"
										: "min-w-0"
								}
							>
								<p className="mb-2 text-xs font-medium text-muted-foreground">
									{message.role === "user" ? "You" : "Assistant"}
								</p>
								{message.parts.map((part, index) =>
									part.type === "text" ? (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: Ordered stream parts are append-only.
											key={index}
											className="whitespace-pre-wrap break-words text-sm leading-7"
										>
											{message.role === "assistant" ? (
												<AssistantAnswer
													text={part.text}
													streaming={c.chat.status === "streaming"}
												/>
											) : (
												part.text
											)}
										</div>
									) : part.type.startsWith("tool-") && "output" in part ? (
										<AssistantResult
											// biome-ignore lint/suspicious/noArrayIndexKey: Ordered stream parts are append-only.
											key={index}
											output={part.output}
											onDecide={c.decide}
											busy={c.busy}
											proposalStatuses={c.proposals.data ?? []}
											onArtifact={(value) =>
												openResult(
													value,
													"toolCallId" in part
														? String(part.toolCallId)
														: message.id,
												)
											}
										/>
									) : null,
								)}
							</article>
						))}
					{!!state.records.length && (
						<div className="space-y-2">
							<p className="text-xs text-muted-foreground">
								Selected records · included with your next message
							</p>
							{state.records.map((record) => (
								<div
									key={`${record.kind}:${record.id}`}
									className="flex items-center justify-between gap-2 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="truncate text-sm">{record.label}</p>
										<p className="text-xs capitalize text-muted-foreground">
											{record.kind}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Remove ${record.label}`}
										onClick={() =>
											state.set({
												records: state.records.filter(
													(item) =>
														item.kind !== record.kind || item.id !== record.id,
												),
											})
										}
									>
										<X className="size-4" />
									</Button>
								</div>
							))}
						</div>
					)}
					{c.busy && (
						<output className="animate-pulse text-sm text-muted-foreground">
							Working on your request…
						</output>
					)}
					{c.error && (
						<div role="alert" className="rounded-lg border p-3 text-sm">
							<p>{c.error}</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								disabled={c.busy}
								onClick={c.reconnect}
							>
								<RefreshCw className="mr-2 size-4" />
								Reconnect
							</Button>
						</div>
					)}
					<div ref={end} />
				</div>
			</div>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void c.send();
				}}
				className="shrink-0 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
			>
				<div className="mx-auto max-w-3xl">
					<AssistantAttachments controller={c} />
					<Textarea
						ref={composer}
						dir="auto"
						aria-label="Message the assistant"
						placeholder="Ask about your school…"
						value={state.draft}
						onChange={(event) => state.set({ draft: event.target.value })}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								!event.shiftKey &&
								!event.nativeEvent.isComposing
							) {
								event.preventDefault();
								void c.send();
							}
						}}
						className="max-h-40 min-h-20 resize-none border-0 shadow-none focus-visible:ring-0"
					/>
					<div className="mt-2 flex items-center justify-between gap-2">
						<div className="flex items-center gap-1">
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Save prompt"
								disabled={!state.draft.trim()}
								onClick={savePrompt}
							>
								<Bookmark className="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setSavedOpen(true)}
							>
								Saved prompts
							</Button>
							{state.conversationId && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setReceiptsOpen(true)}
								>
									Saved actions
								</Button>
							)}
						</div>
						{c.busy ? (
							<Button
								type="button"
								size="icon"
								aria-label="Stop response"
								onClick={c.stop}
							>
								<Square className="size-4" />
							</Button>
						) : (
							<Button
								size="icon"
								aria-label="Send message"
								disabled={
									!state.draft.trim() ||
									c.bootstrap.isError ||
									c.bootstrap.isPending ||
									c.detail.data?.status === "archived" ||
									c.detail.data?.protocolVersion === 1
								}
							>
								<ArrowUp className="size-4" />
							</Button>
						)}
					</div>
					{c.detail.data?.protocolVersion === 1 && (
						<p className="mt-2 text-xs text-muted-foreground">
							Historical conversation. Start a new chat to continue with the new
							assistant.
						</p>
					)}
				</div>
			</form>
			<Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
				<SheetContent className="overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Conversations</SheetTitle>
						<SheetDescription>
							Only history covered by your current permissions is shown.
						</SheetDescription>
					</SheetHeader>
					<Input
						aria-label="Search conversations"
						placeholder="Search conversations"
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							setCursor(undefined);
						}}
						className="my-4"
					/>
					<Button
						variant="ghost"
						onClick={() => {
							setArchived(!archived);
							setCursor(undefined);
						}}
					>
						{archived ? "Show active" : "Show archived"}
					</Button>
					{list.isPending ? (
						<p>Loading…</p>
					) : list.isError ? (
						<p>History unavailable.</p>
					) : !list.data?.items.length ? (
						<p className="mt-4 text-sm text-muted-foreground">
							No conversations found.
						</p>
					) : (
						list.data.items.map((item) => (
							<div key={item.id} className="border-b py-3">
								<Button
									variant="ghost"
									disabled={c.busy}
									className="h-auto w-full justify-start whitespace-normal text-left"
									onClick={() => select(item.id)}
								>
									{item.title ?? "New conversation"}
								</Button>
								<div className="flex gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={async () => {
											const title = window.prompt(
												"Conversation title",
												item.title ?? "",
											);
											if (title?.trim()) {
												await c.api.assistant.update.mutate({
													conversationId: item.id,
													title,
												});
												await list.refetch();
											}
										}}
									>
										Rename
									</Button>
									<Button
										variant="ghost"
										size="sm"
										disabled={c.busy}
										onClick={async () => {
											await c.api.assistant.update.mutate({
												conversationId: item.id,
												archived: !archived,
											});
											if (item.id === state.conversationId) reset();
											await list.refetch();
										}}
									>
										{archived ? "Restore" : "Archive"}
									</Button>
								</div>
							</div>
						))
					)}
					<div className="mt-4 flex gap-2">
						{cursor && (
							<Button variant="outline" onClick={() => setCursor(undefined)}>
								First page
							</Button>
						)}
						{list.data?.nextCursor && (
							<Button
								variant="outline"
								onClick={() => setCursor(list.data?.nextCursor)}
							>
								Next page
							</Button>
						)}
					</div>
				</SheetContent>
			</Sheet>
			<Sheet
				open={artifact !== null}
				onOpenChange={(open) => {
					if (!open) closeResult();
				}}
			>
				<SheetContent className="overflow-y-auto sm:max-w-xl">
					<SheetHeader>
						<SheetTitle>Assistant result</SheetTitle>
						<SheetDescription>
							Recorded output from this conversation.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<ResultDetails value={artifact} />
						{state.conversationId && (
							<AssistantExports conversationId={state.conversationId} />
						)}
					</div>
				</SheetContent>
			</Sheet>
			<Sheet open={receiptsOpen} onOpenChange={setReceiptsOpen}>
				<SheetContent className="overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Saved actions</SheetTitle>
						<SheetDescription>
							Committed receipts. An empty list does not prove an interrupted
							action rolled back.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-5 space-y-4">
						{receipts.data?.map((receipt) => (
							<div key={receipt.id} className="rounded-lg border p-3">
								<ResultDetails value={receipt.output} />
							</div>
						))}
					</div>
					{state.conversationId && (
						<>
							<AssistantExports conversationId={state.conversationId} />
							<AssistantFiles conversationId={state.conversationId} />
						</>
					)}
					<div className="my-4 flex gap-2">
						<Button
							variant="outline"
							onClick={async () => {
								if (state.conversationId) {
									await c.api.assistant.feedback.mutate({
										conversationId: state.conversationId,
										rating: 5,
									});
									setFeedback("Thank you for the feedback.");
								}
							}}
						>
							Helpful
						</Button>
						<Button
							variant="outline"
							onClick={async () => {
								if (state.conversationId) {
									await c.api.assistant.feedback.mutate({
										conversationId: state.conversationId,
										rating: 1,
									});
									setFeedback("Feedback saved.");
								}
							}}
						>
							Needs improvement
						</Button>
					</div>
					{feedback && <output>{feedback}</output>}
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => receipts.refetch()}
					>
						Refresh
					</Button>
				</SheetContent>
			</Sheet>
			<Sheet open={savedOpen} onOpenChange={setSavedOpen}>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Saved prompts</SheetTitle>
						<SheetDescription>
							Choose a prompt to edit before sending. Each action needs a fresh
							review.
						</SheetDescription>
					</SheetHeader>
					<label className="mt-4 block text-sm">
						Response language
						<select
							aria-label="Response language"
							className="ml-2 rounded border bg-background p-2"
							value={preferences.data?.locale ?? "auto"}
							onChange={async (event) => {
								try {
									await c.api.assistant.savePreferences.mutate({
										locale: event.target.value as "auto" | "en" | "ar",
										savedPrompts: saved,
									});
									await preferences.refetch();
								} catch {
									c.setError("Unable to save the language preference.");
								}
							}}
						>
							<option value="auto">Automatic</option>
							<option value="en">English</option>
							<option value="ar">العربية</option>
						</select>
					</label>
					<div className="mt-5 space-y-2">
						{saved.map((prompt) => (
							<Button
								key={prompt.id}
								variant="outline"
								className="h-auto w-full justify-start whitespace-normal text-left"
								onClick={() => {
									state.set({ draft: prompt.text });
									setSavedOpen(false);
								}}
							>
								{prompt.title}
							</Button>
						))}
					</div>
				</SheetContent>
			</Sheet>
			<AssistantSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
		</div>
	);
	if (state.target) return createPortal(content, state.target);
	return createPortal(
		<aside
			aria-label="Quick Assistant"
			hidden={!state.opened}
			className="print:hidden fixed inset-x-2 bottom-2 z-[70] h-[min(680px,calc(100dvh-1rem))] overflow-hidden rounded-xl border shadow-xl sm:left-auto sm:right-5 sm:bottom-5 sm:w-[440px]"
		>
			{content}
		</aside>,
		document.body,
	);
}
