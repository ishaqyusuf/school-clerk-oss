"use client";
import { useCallback } from "react";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { useQuickAssistantStore } from "@/store/quick-assistant";
export function AssistantPageWorkspace() {
	const register = useCallback((target: HTMLDivElement | null) => {
		useQuickAssistantStore.setState({
			target,
			...(target ? { initialized: true, opened: false } : {}),
		});
	}, []);
	return (
		<>
			<PageTitle>Assistant</PageTitle>
			<div ref={register} className="h-[calc(100dvh-8rem)] min-h-96" />
		</>
	);
}
