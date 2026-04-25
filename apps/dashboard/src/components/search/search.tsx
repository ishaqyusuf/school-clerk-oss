"use client";

import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchStore } from "@/store/search";
import { useTRPC } from "@/trpc/client";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@school-clerk/ui/command";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Sparkles, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalSearchResults } from "./search-catalog";
import type { SearchItem } from "./search-types";

function groupIcon(group: SearchItem["group"]) {
	switch (group) {
		case "Students":
			return <Users className="size-4 text-muted-foreground" />;
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
	const trpc = useTRPC();
	const auth = useAuth();
	const setOpen = useSearchStore((state) => state.setOpen);
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query, 220);
	const inputRef = useRef<HTMLInputElement>(null);
	const normalizedQuery = debouncedQuery
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

	useEffect(() => {
		const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
		return () => window.clearTimeout(timer);
	}, []);

	const localResults = useMemo(
		() =>
			getLocalSearchResults({
				limit: normalizedQuery ? 8 : 10,
				query: normalizedQuery,
				role: auth.role,
			}),
		[auth.role, normalizedQuery],
	);

	const remoteQuery = useQuery(
		trpc.search.global.queryOptions(
			{
				limit: 10,
				query: normalizedQuery,
			},
			{
				enabled: normalizedQuery.length >= 2,
				staleTime: 20_000,
			},
		),
	);

	const remoteResults = useMemo<SearchItem[]>(
		() =>
			(remoteQuery.data || []).map((item) => ({
				href: item.href,
				id: item.id,
				group: item.group,
				rank: item.rank,
				subtitle: item.subtitle,
				title: item.title,
				type: item.type,
			})),
		[remoteQuery.data],
	);

	const groupedResults = useMemo(() => {
		const order: Array<SearchItem["group"]> = [
			"Quick Actions",
			"Pages",
			"Students",
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
		setOpen(false);
		setQuery("");
		router.push(href);
	};

	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
			<Command shouldFilter={false} className="h-[520px]">
				<div className="flex items-center border-b border-border px-3">
					<Search className="size-4 text-muted-foreground" />
					<CommandInput
						ref={inputRef}
						className="h-12"
						onValueChange={setQuery}
						placeholder="Find pages, students, staff..."
						value={query}
					/>
					{remoteQuery.isFetching ? (
						<Loader2 className="size-4 animate-spin text-muted-foreground" />
					) : null}
				</div>

				<CommandList className="max-h-[468px]">
					<CommandEmpty className="px-4 py-8 text-sm text-muted-foreground">
						{normalizedQuery.length >= 2
							? "No matching pages, students, or staff were found."
							: "Type at least 2 characters to search students and staff."}
					</CommandEmpty>

					{groupedResults.map((entry, index) => (
						<div key={entry.group}>
							{index > 0 ? <CommandSeparator /> : null}
							<CommandGroup heading={entry.group}>
								{entry.items.map((item) => (
									<CommandItem
										key={`${item.group}-${item.id}`}
										onSelect={() => handleSelect(item.href)}
										value={`${item.title} ${item.subtitle || ""} ${item.group}`}
										className="flex items-center gap-3 rounded-md px-3 py-3"
									>
										<div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40">
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
										<div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
											{item.group}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</div>
					))}

					{!hasResults && normalizedQuery.length < 2 ? (
						<div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
							Top pages and quick actions are shown immediately. People search
							starts after 2 characters.
						</div>
					) : null}
				</CommandList>
			</Command>
		</div>
	);
}
