"use client";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQuickAssistantStore } from "@/store/quick-assistant";
const Runtime = dynamic(
	() => import("./assistant-runtime").then((module) => module.AssistantRuntime),
	{ ssr: false },
);
export function AssistantHost({
	available,
	scope,
}: { available: boolean; scope: string }) {
	const queryClient = useQueryClient();
	const storedScope = useQuickAssistantStore((s) => s.scope);
	const initialized = useQuickAssistantStore((s) => s.initialized);
	useEffect(() => {
		const current = useQuickAssistantStore.getState();
		if (current.scope !== scope || !available) {
			// Initial mount may already have settings queries in flight. Clear
			// cached identities only when an established workspace changes.
			if (current.scope !== null)
				void queryClient.resetQueries({
					predicate: (q) =>
						Array.isArray(q.queryKey[0]) && q.queryKey[0][0] === "assistant",
				});
			const target = current.target;
			current.reset();
			useQuickAssistantStore.setState({ target, initialized: !!target });
		}
		useQuickAssistantStore.setState({ available, scope });
		return () => {};
	}, [scope, available, queryClient]);
	useEffect(
		() => () => {
			useQuickAssistantStore.getState().reset();
			// Reset active observers as well as cached data. Removing active
			// queries strands the settings sheet during React's effect replay.
			void queryClient.resetQueries({
				predicate: (q) =>
					Array.isArray(q.queryKey[0]) && q.queryKey[0][0] === "assistant",
			});
		},
		[queryClient],
	);
	return available && initialized && storedScope === scope ? (
		<Runtime key={scope} />
	) : null;
}
