"use client";
import { DropdownMenuItem } from "@school-clerk/ui/dropdown-menu";
import { Button } from "@school-clerk/ui/button";
import { Sparkles } from "lucide-react";
import type { AssistantContextRecord } from "@school-clerk/ai/contracts";
import { useQuickAssistantStore } from "@/store/quick-assistant";
export function OpenAssistant({
	records = [],
	compact = false,
	menuItem = false,
}: {
	records?: AssistantContextRecord[];
	compact?: boolean;
	menuItem?: boolean;
}) {
	const available = useQuickAssistantStore((s) => s.available);
	const open = useQuickAssistantStore((s) => s.open);
	if (!available) return null;
	if (menuItem)
		return (
			<DropdownMenuItem onSelect={() => setTimeout(() => open(records), 0)}>
				<Sparkles className="mr-2 size-4" />
				Ask Assistant
			</DropdownMenuItem>
		);
	return (
		<Button
			type="button"
			variant="ghost"
			size={compact ? "icon" : "sm"}
			className="min-h-11"
			aria-label="Open quick Assistant"
			onClick={(event) => {
				event.stopPropagation();
				open(records);
			}}
		>
			<Sparkles className="size-4" />
			{!compact && <span className="ml-2">Ask Assistant</span>}
		</Button>
	);
}
