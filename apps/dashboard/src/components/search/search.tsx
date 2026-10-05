"use client";

import { useGlobalSearch } from "@/hooks/use-global-search";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchStore } from "@/store/search";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@school-clerk/ui/command";
import {
	GraduationCap,
	Loader2,
	Search,
	Sparkles,
	UserRound,
	Users,
	X,
} from "lucide-react";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalSearchResults } from "./search-catalog";
import type { SearchItem } from "./search-types";

function groupIcon(group: SearchItem["group"]) {
	switch (group) {
		case "Students":
			return <Users className="size-4 text-muted-foreground" />;
		case "Classrooms":
			return <GraduationCap className="size-4 text-muted-foreground" />;
		case "Staff":
			return <UserRound className="size-4 text-muted-foreground" />;
		case "Quick Actions":
			return <Sparkles className="size-4 text-muted-foreground" />;
		default:
			return <Search className="size-4 text-muted-foreground" />;
	}
}

export function SearchPanel() {
	const router = useRouter();
	const setOpen = useSearchStore((state) => state.setOpen);
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query, 220);
	const inputRef = useRef<HTMLInputElement>(null);
	const normalizedQuery = debouncedQuery
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	const search = useGlobalSearch(normalizedQuery);

	useEffect(() => {
		const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
		return () => window.clearTimeout(timer);
	}, []);

	const localResults = useMemo(
		() =>
			search.scope ? getLocalSearchResults({
				limit: normalizedQuery ? 8 : 10,
				query: normalizedQuery,
				role: search.scope.role,
				tenantModules: search.scope.effectiveModules,
			}) : [],
		[search.scope, normalizedQuery],
	);

	const remoteResults = useMemo<SearchItem[]>(
		() =>
			search.records.map((item) => ({
				href: item.href,
				id: item.id,
				group: item.group,
				rank: item.rank,
				subtitle: item.subtitle,
				title: item.title,
				type: item.type,
			})),
		[search.records],
	);

	const groupedResults = useMemo(() => {
		const order: Array<SearchItem["group"]> = [
			"Quick Actions",
			"Pages",
			"Students",
			"Classrooms",
			"Staff",
		];
		const allResults = [...localResults, ...remoteResults];

		return order
			.map((group) => ({
				group,
				items: allResults.filter((item) => item.group === group),
			}))
			.filter((entry) => entry.items.length > 0);
	}, [localResults, remoteResults]);

	const hasResults = groupedResults.length > 0;

	const handleSelect = (href: string) => {
		if (!search.scope || !groupedResults.some((entry) => entry.items.some((item) => item.href === href))) return;
		setOpen(false);
		setQuery("");
		router.push(href);
	};

	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
			<Command shouldFilter={false} className="h-[min(520px,calc(100dvh-4rem))]">
				<div className="flex shrink-0 items-center border-b border-border px-3 [&_[cmdk-input-wrapper]]:min-w-0">
					<Search className="size-4 shrink-0 text-muted-foreground" />
					<CommandInput
						ref={inputRef}
						className="h-12 min-w-0"
						maxLength={100}
						aria-label="Search permitted pages and records"
						onValueChange={setQuery}
						placeholder="Find pages, students, classrooms, staff..."
						value={query}
					/>
					{search.pending ? (
						<Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
					) : null}
					<button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
						<X className="size-4" aria-hidden="true" />
					</button>
				</div>

				<CommandList className="min-h-0 max-h-none flex-1 overflow-y-auto overscroll-contain" aria-busy={search.pending}>
					{search.error ? (
						<div role="alert" className="space-y-2 px-4 py-6 text-sm">
							<p>Search could not confirm your workspace access. Retry, or reload the page if you changed schools or accounts.</p>
							<button type="button" onClick={() => void search.retry()} className="min-h-11 rounded-md border px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Retry search</button>
						</div>
					) : search.pending ? (
						<div role="status" className="px-4 py-6 text-sm text-muted-foreground">Checking permitted search results…</div>
					) : null}
					{!search.error && !search.pending ? (
					<CommandEmpty className="px-4 py-8 text-sm text-muted-foreground">
						{normalizedQuery.length >= 2
							? "No matching permitted pages or records were found."
							: "Type at least 2 characters to search permitted records."}
					</CommandEmpty>
					) : null}

					{groupedResults.map((entry, index) => (
						<div key={entry.group}>
							{index > 0 ? <CommandSeparator /> : null}
							<CommandGroup heading={entry.group}>
								{entry.items.map((item) => (
									<CommandItem
										key={`${item.group}-${item.id}`}
										onSelect={() => handleSelect(item.href)}
										value={`${item.title} ${item.subtitle || ""} ${item.group}`}
										className="flex min-h-11 items-center gap-3 rounded-md px-3 py-3"
									>
										<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
											{groupIcon(item.group)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium">
												{item.title}
											</div>
											{item.subtitle ? (
												<div className="truncate text-xs text-muted-foreground">
													{item.subtitle}
												</div>
											) : null}
										</div>
										<div className="hidden shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
											{item.group}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</div>
					))}

					{!search.error && !search.pending && !hasResults && normalizedQuery.length < 2 ? (
						<div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
							Permitted pages and quick actions appear after access is checked. Record search
							starts after 2 characters.
						</div>
					) : null}
				</CommandList>
			</Command>
		</div>
	);
}
