"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useQuickAssistantStore } from "@/store/quick-assistant";
export function useAssistantController() {
	const state = useQuickAssistantStore();
	const trpc = useTRPC();
	const api = useTRPCClient();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [runId, setRunId] = useState<string | null>(null);
	const [acting, setActing] = useState(false);
	const request = useRef<{
		conversationId: string;
		requestId: string;
		text: string;
		records: typeof state.records;
		attachmentIds: string[];
	} | null>(null);
	const bootstrap = useQuery(trpc.assistant.bootstrap.queryOptions());
	const proposals = useQuery(
		trpc.assistant.proposals.queryOptions(
			{ conversationId: state.conversationId ?? "" },
			{ enabled: !!state.conversationId },
		),
	);
	const detail = useQuery(
		trpc.assistant.get.queryOptions(
			{ conversationId: state.conversationId ?? "" },
			{
				enabled: !!state.conversationId,
				refetchInterval: (q) =>
					q.state.data?.runs.some((r) => r.status === "running") ? 2000 : false,
			},
		),
	);
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/assistant/chat",
				prepareSendMessagesRequest: () => ({ body: request.current }),
				fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
					const response = await fetch(input, init);
					const id = response.headers.get("x-assistant-run-id");
					if (id) {
						request.current = null;
						setRunId(id);
						useQuickAssistantStore
							.getState()
							.set({ draft: "", records: [], attachmentIds: [] });
					}
					if (response.status === 409) {
						const saved = await response.clone().json();
						if (saved.runId) setRunId(saved.runId);
					}

					return response;
				}) as typeof fetch,
			}),
		[],
	);
	const chat = useChat({
		transport,
		onError: () => {
			setError(
				"Response interrupted. Reconnect to check the saved response and actions before trying again.",
			);
		},
		onFinish: () => {
			void queryClient.invalidateQueries({
				queryKey: trpc.assistant.proposals.queryKey(),
			});
			void queryClient.invalidateQueries({
				queryKey: trpc.assistant.list.queryKey(),
			});
			void queryClient.invalidateQueries({
				queryKey: trpc.assistant.get.queryKey(),
			});
		},
	});
	const { setMessages } = chat;
	const hydrated = useRef<string | null>(null);
	useEffect(() => {
		if (
			detail.data &&
			detail.data.id === state.conversationId &&
			chat.status !== "streaming" &&
			chat.status !== "submitted"
		) {
			if (
				detail.data.runs[0]?.status === "running" &&
				hydrated.current === detail.data.id
			)
				return;
			setMessages(detail.data.messages as UIMessage[]);
			hydrated.current = detail.data.id;
			const latest = detail.data.runs[0];
			setRunId(latest?.id ?? null);
			if (latest?.error) setError(latest.error);
		}
	}, [detail.data, chat.status, state.conversationId, setMessages]);
	useEffect(() => {
		if (hydrated.current !== state.conversationId) {
			setMessages([]);
			setRunId(null);
			setError(null);
			hydrated.current = null;
		}
	}, [state.conversationId, setMessages]);
	const sending = chat.status === "streaming" || chat.status === "submitted";
	useEffect(() => {
		if (bootstrap.isError || detail.isError) {
			setMessages([]);
			setError("This conversation is unavailable under your current access.");
		}
	}, [bootstrap.isError, detail.isError, setMessages]);
	const busy =
		sending ||
		acting ||
		!!detail.data?.runs.some((run) => run.status === "running");
	const recovering = !!detail.data?.runs.some(
		(run) => run.status === "running",
	);
	async function send() {
		if (
			!state.draft.trim() ||
			busy ||
			bootstrap.isPending ||
			bootstrap.isError ||
			detail.data?.status === "archived"
		)
			return;
		setError(null);
		setActing(true);
		try {
			const conversationId =
				state.conversationId ?? (await api.assistant.create.mutate()).id;
			state.set({ conversationId });
			const nextRequest = {
				conversationId,
				requestId: crypto.randomUUID(),
				text: state.draft.trim(),
				records: state.records,
				attachmentIds: state.attachmentIds,
			};
			const previous = request.current;
			request.current =
				previous &&
				previous.conversationId === conversationId &&
				previous.text === nextRequest.text &&
				JSON.stringify(previous.records) ===
					JSON.stringify(nextRequest.records) &&
				JSON.stringify(previous.attachmentIds) ===
					JSON.stringify(nextRequest.attachmentIds)
					? previous
					: nextRequest;
			const text = state.draft.trim();

			hydrated.current = conversationId;
			await chat.sendMessage({ text });
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unable to send message.");
		} finally {
			setActing(false);
		}
	}
	async function reconnect() {
		setActing(true);
		try {
			const result = await detail.refetch();
			if (result.data) {
				setMessages(result.data.messages as UIMessage[]);
				const latest = result.data.runs[0];
				setRunId(latest?.id ?? null);
				setError(
					latest?.status === "running"
						? "The response is still running or awaiting recovery. Check saved actions before repeating a change."
						: (latest?.error ?? null),
				);
			}
		} finally {
			setActing(false);
		}
	}
	async function decide(proposalId: string, approve: boolean) {
		setActing(true);
		setError(null);
		try {
			await api.assistant.decide.mutate({
				proposalId,
				approve,
				requestId: crypto.randomUUID(),
			});
			await queryClient.invalidateQueries({
				queryKey: trpc.assistant.pathKey(),
			});
			for (const domain of [
				"students",
				"finance",
				"inventory",
				"assessments",
				"classrooms",
			])
				await queryClient.invalidateQueries({
					predicate: (q) =>
						Array.isArray(q.queryKey[0]) && q.queryKey[0][0] === domain,
				});
			await reconnect();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Check saved actions.");
		} finally {
			setActing(false);
		}
	}
	async function stop() {
		try {
			if (runId) await api.assistant.cancel.mutate({ runId });
			chat.stop();
			await reconnect();
		} catch {
			setError("Unable to stop yet. Reconnect to check the saved response.");
		}
	}
	function newChat() {
		if (busy) return;
		state.set({
			conversationId: null,
			draft: "",
			records: [],
			attachmentIds: [],
		});
		setMessages([]);
		setError(null);
		setRunId(null);
		request.current = null;
	}
	return {
		state,
		chat,
		bootstrap,
		detail,
		proposals,
		recovering,
		error,
		busy,
		send,
		reconnect,
		decide,
		stop,
		newChat,
		api,
		trpc,
		queryClient,
		setError,
	};
}
