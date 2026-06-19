"use client";

import { useSearchStore } from "@/store/search";
import { Button } from "@school-clerk/ui/button";
import { Search } from "lucide-react";

export function OpenSearchButton() {
	const setOpen = useSearchStore((state) => state.setOpen);

	return (
		<Button
			variant="outline"
			className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border-border/70 bg-background/70 p-0 text-sm font-normal text-muted-foreground shadow-sm transition hover:bg-background lg:h-10 lg:w-full lg:max-w-md lg:justify-start lg:gap-2 lg:px-3"
			onClick={() => setOpen(true)}
			type="button"
			aria-label="Find anything"
		>
			<Search className="size-4 shrink-0" aria-hidden="true" />
			<span className="sr-only lg:not-sr-only lg:truncate">
				Find anything...
			</span>
			<kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground xl:inline-flex">
				⌘K
			</kbd>
		</Button>
	);
}
