"use client";

import { useSearchStore } from "@/store/search";
import { Button } from "@school-clerk/ui/button";
import { Search } from "lucide-react";

export function OpenSearchButton() {
	const setOpen = useSearchStore((state) => state.setOpen);

	return (
		<Button
			variant="outline"
			className="relative hidden h-10 w-full max-w-md items-center justify-start gap-2 rounded-xl border-border/70 bg-background/70 px-3 text-sm font-normal text-muted-foreground shadow-sm transition hover:bg-background md:flex"
			onClick={() => setOpen(true)}
			type="button"
		>
			<Search className="size-4" />
			<span className="truncate">Find anything...</span>
			<kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex">
				⌘K
			</kbd>
		</Button>
	);
}
