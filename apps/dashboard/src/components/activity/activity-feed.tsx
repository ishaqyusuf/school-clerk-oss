"use client";

import { useDebounce } from "@/hooks/use-debounce";
import {
	type ActivityRange,
	resolveActivityRange,
	useActivityParams,
} from "@/hooks/use-activity-params";
import { useTRPC } from "@/trpc/client";
import { formatActivityAmount } from "@school-clerk/notifications/activities";
import type { ActivityTypeName } from "@school-clerk/utils/activity";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Input } from "@school-clerk/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
	Activity,
	Calendar,
	ChevronDown,
	ChevronUp,
	ListFilter,
	Loader2,
	Lock,
	Search,
	User,
	Users,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	type DigestEntry,
	bucketByDay,
	digestDay,
	localDayKey,
	summarizeDay,
} from "./activity-digest";
import { ActivityParts, activityPartClasses } from "./activity-parts";
import {
	type ActivityBurst,
	ActivityBurstSheet,
	ActivityDetailSheet,
} from "./activity-sheet";
import {
	type ActivityFeedItem,
	ActivityMeta,
	BurstPills,
	BurstSentence,
	burstTimeRange,
	formatActivityTime,
} from "./activity-shared";
import {
	ACTIVITY_CATEGORY_STYLES,
	ActivityAvatar,
} from "./activity-visuals";

const RANGE_OPTIONS: { value: ActivityRange | "any"; label: string }[] = [
	{ value: "any", label: "Any time" },
	{ value: "today", label: "Today" },
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "custom", label: "Custom range…" },
];

function rangeLabel(range: ActivityRange | null, from: string | null, to: string | null) {
	if (range === "custom") {
		const day = (value: string | null) =>
			value
				? new Date(`${value}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
				: "…";
		return `${day(from)} – ${day(to)}`;
	}
	return RANGE_OPTIONS.find((option) => option.value === (range ?? "any"))?.label ?? "Any time";
}

function studentHref(studentId: string) {
	return `/students?${new URLSearchParams({ studentViewId: studentId, studentViewTab: "overview" })}`;
}

function dayHeading(date: Date) {
	const today = new Date();
	const yesterday = new Date(today.getTime() - 86_400_000);
	const key = localDayKey(date);
	const label =
		key === localDayKey(today)
			? "Today"
			: key === localDayKey(yesterday)
				? "Yesterday"
				: date.toLocaleDateString("en-NG", { weekday: "long" });
	const sub = date.toLocaleDateString("en-NG", {
		day: "numeric",
		month: "short",
		...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
	});
	return { label, sub };
}

type FilterData = {
	canViewAll: boolean;
	categories: {
		category: ActivityFeedItem["category"];
		label: string;
		count: number;
		types: { type: ActivityTypeName; label: string; count: number }[];
	}[];
	members:
		| { userId: string; name: string; role: string | null; count: number }[]
		| null;
};

export function ActivityFeed() {
	const trpc = useTRPC();
	const router = useRouter();
	const isMobile = useIsMobile();
	const { params, setParams } = useActivityParams();
	const [searchDraft, setSearchDraft] = useState(params.q ?? "");
	const q = useDebounce(searchDraft.trim(), 300);
	const [expanded, setExpanded] = useState<string[]>([]);
	const [burst, setBurst] = useState<ActivityBurst | null>(null);
	const [backToBurst, setBackToBurst] = useState<ActivityBurst | null>(null);
	const [mobileFilters, setMobileFilters] = useState(false);

	const range = useMemo(
		() => resolveActivityRange(params),
		[params.range, params.from, params.to],
	);

	const filtersQuery = useQuery(
		trpc.activity.filters.queryOptions(
			{ from: range.from, to: range.to, scope: params.scope ?? undefined },
			{ placeholderData: keepPreviousData },
		),
	);
	const filters = filtersQuery.data as FilterData | undefined;
	const canViewAll = filters?.canViewAll ?? false;
	const scope: "mine" | "all" = canViewAll ? (params.scope ?? "all") : "mine";
	const memberIds = canViewAll && scope === "all" ? (params.members ?? []) : [];
	const types = params.types ?? [];

	const listInput = {
		from: range.from,
		to: range.to,
		types: types.length ? types : null,
		userIds: memberIds.length ? memberIds : null,
		q: q || null,
		scope,
		limit: 30,
	};
	const feed = useInfiniteQuery(
		trpc.activity.list.infiniteQueryOptions(listInput, {
			getNextPageParam: (page) => page.nextCursor ?? undefined,
			placeholderData: keepPreviousData,
			enabled: Boolean(filters),
		}),
	);
	const items = useMemo(
		() => feed.data?.pages.flatMap((page) => page.items) ?? [],
		[feed.data],
	);
	const days = useMemo(() => bucketByDay(items), [items]);

	const activeFilterCount =
		(params.range ? 1 : 0) + (types.length ? 1 : 0) + (memberIds.length ? 1 : 0);
	const hasQuery = Boolean(q);

	const clearAll = () => {
		setSearchDraft("");
		void setParams({ range: null, from: null, to: null, types: null, members: null, q: null });
	};
	const toggleType = (type: ActivityTypeName) => {
		const next = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
		void setParams({ types: next.length ? next : null });
	};
	const toggleCategory = (categoryTypes: ActivityTypeName[]) => {
		const all = categoryTypes.every((type) => types.includes(type));
		const next = all
			? types.filter((type) => !categoryTypes.includes(type))
			: [...new Set([...types, ...categoryTypes])];
		void setParams({ types: next.length ? next : null });
	};
	const toggleMember = (userId: string) => {
		const next = memberIds.includes(userId)
			? memberIds.filter((id) => id !== userId)
			: [...memberIds, userId];
		void setParams({ members: next.length ? next : null });
	};
	const setRange = (value: ActivityRange | "any") => {
		if (value === "custom") {
			const today = localDayKey(new Date());
			void setParams({ range: "custom", from: params.from ?? today, to: params.to ?? today });
			return;
		}
		void setParams({ range: value === "any" ? null : value, from: null, to: null });
	};
	const openActivity = (id: string, from?: ActivityBurst | null) => {
		setBackToBurst(from ?? null);
		setBurst(null);
		void setParams({ activityId: id });
	};
	const goStudent = (id: string) => router.push(studentHref(id));

	const typeLabelById = new Map(
		(filters?.categories ?? []).flatMap((category) =>
			category.types.map((type) => [type.type, type.label] as const),
		),
	);

	const chips: { key: string; icon: React.ReactNode; label: string; clear: () => void }[] = [];
	if (params.range)
		chips.push({
			key: "range",
			icon: <Calendar className="size-3.5" />,
			label: rangeLabel(params.range, params.from, params.to),
			clear: () => void setParams({ range: null, from: null, to: null }),
		});
	if (types.length) {
		const names = types.map((type) => typeLabelById.get(type) ?? type);
		chips.push({
			key: "types",
			icon: <ListFilter className="size-3.5" />,
			label: names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", "),
			clear: () => void setParams({ types: null }),
		});
	}
	if (memberIds.length) {
		const names = memberIds.map(
			(id) => filters?.members?.find((member) => member.userId === id)?.name ?? "Member",
		);
		chips.push({
			key: "members",
			icon: <User className="size-3.5" />,
			label: names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? ""),
			clear: () => void setParams({ members: null }),
		});
	}

	const searchBox = (
		<label className="relative flex min-w-0 flex-1 items-center md:max-w-xs">
			<Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
			<span className="sr-only">Search activity</span>
			<Input
				type="search"
				value={searchDraft}
				onChange={(event) => {
					setSearchDraft(event.target.value);
					void setParams({ q: event.target.value.trim() || null });
				}}
				placeholder="Search activity…"
				autoComplete="off"
				className="h-11 pl-8 md:h-9"
			/>
		</label>
	);

	const filterButton = isMobile ? (
		<Button
			type="button"
			variant="outline"
			size="icon"
			className="relative size-11 shrink-0"
			aria-label="Filter"
			onClick={() => setMobileFilters(true)}
		>
			<ListFilter className="size-4" />
			{activeFilterCount ? (
				<span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
					{activeFilterCount}
				</span>
			) : null}
		</Button>
	) : (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
					<ListFilter className="size-4" />
					Filter
					{activeFilterCount ? (
						<span className="grid size-[18px] place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
							{activeFilterCount}
						</span>
					) : null}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-60">
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="gap-2">
						<Calendar className="size-4" />
						Date
						<span className="ml-auto text-xs text-muted-foreground">
							{rangeLabel(params.range, params.from, params.to)}
						</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="w-60">
						<DropdownMenuRadioGroup
							value={params.range ?? "any"}
							onValueChange={(value) => setRange(value as ActivityRange | "any")}
						>
							{RANGE_OPTIONS.map((option) => (
								<DropdownMenuRadioItem
									key={option.value}
									value={option.value}
									onSelect={(event) => option.value === "custom" && event.preventDefault()}
								>
									{option.label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						{params.range === "custom" ? (
							<CustomRangeInputs
								from={params.from}
								to={params.to}
								onChange={(next) => void setParams(next)}
							/>
						) : null}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="gap-2">
						<ListFilter className="size-4" />
						Activity type
						<span className="ml-auto text-xs text-muted-foreground">
							{types.length ? `${types.length} selected` : "All"}
						</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="max-h-[420px] w-72 overflow-y-auto">
						{(filters?.categories ?? []).map((category, index) => {
							const categoryTypes = category.types.map((type) => type.type);
							const selected = categoryTypes.filter((type) => types.includes(type)).length;
							return (
								<div key={category.category}>
									{index > 0 ? <DropdownMenuSeparator /> : null}
									<DropdownMenuCheckboxItem
										checked={
											selected === categoryTypes.length
												? true
												: selected
													? "indeterminate"
													: false
										}
										onSelect={(event) => {
											event.preventDefault();
											toggleCategory(categoryTypes);
										}}
										className="font-semibold"
									>
										<span
											className={cn(
												"mr-2 inline-block size-2 rounded-full",
												ACTIVITY_CATEGORY_STYLES[category.category]?.dot,
											)}
										/>
										{category.label}
										<span className="ml-auto pl-2 text-xs font-normal text-muted-foreground">
											{category.count}
										</span>
									</DropdownMenuCheckboxItem>
									{category.types.map((type) => (
										<DropdownMenuCheckboxItem
											key={type.type}
											checked={types.includes(type.type)}
											onSelect={(event) => {
												event.preventDefault();
												toggleType(type.type);
											}}
											className="pl-12"
										>
											{type.label}
											<span className="ml-auto pl-2 text-xs text-muted-foreground">
												{type.count || ""}
											</span>
										</DropdownMenuCheckboxItem>
									))}
								</div>
							);
						})}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				{canViewAll && scope === "all" ? (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="gap-2">
							<Users className="size-4" />
							Member
							<span className="ml-auto text-xs text-muted-foreground">
								{memberIds.length ? `${memberIds.length} selected` : "Anyone"}
							</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-[420px] w-72 overflow-y-auto">
							{filters?.members?.length ? (
								filters.members.map((member) => (
									<DropdownMenuCheckboxItem
										key={member.userId}
										checked={memberIds.includes(member.userId)}
										onSelect={(event) => {
											event.preventDefault();
											toggleMember(member.userId);
										}}
										className="gap-2"
									>
										<ActivityAvatar name={member.name} userId={member.userId} size="sm" />
										<span className="truncate">{member.name}</span>
										<span className="ml-auto pl-2 text-xs capitalize text-muted-foreground">
											{member.role?.toLowerCase() ?? ""}
										</span>
									</DropdownMenuCheckboxItem>
								))
							) : (
								<DropdownMenuLabel className="font-normal text-muted-foreground">
									No members have activity yet
								</DropdownMenuLabel>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const scopeSwitch = canViewAll ? (
		<div
			role="group"
			aria-label="Scope"
			className="inline-flex shrink-0 rounded-lg border bg-muted/50 p-0.5"
		>
			{(["mine", "all"] as const).map((value) => (
				<button
					key={value}
					type="button"
					aria-pressed={scope === value}
					onClick={() => void setParams({ scope: value === "all" ? null : value, members: null })}
					className={cn(
						"min-h-10 flex-1 rounded-md px-3 text-sm text-muted-foreground transition-colors md:min-h-8",
						scope === value && "bg-background font-medium text-foreground shadow-sm",
					)}
				>
					{value === "mine" ? "My activity" : "All activity"}
				</button>
			))}
		</div>
	) : filters ? (
		<span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
			<Lock className="size-3.5" />
			Your activity
		</span>
	) : null;

	const chipRow = chips.length ? (
		<div className="flex flex-wrap items-center gap-1.5">
			{chips.map((chip) => (
				<span
					key={chip.key}
					className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-card pl-2.5 pr-1 text-[13px]"
				>
					{chip.icon}
					<span className="max-w-[200px] truncate">{chip.label}</span>
					<button
						type="button"
						className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label={`Remove ${chip.key} filter`}
						onClick={chip.clear}
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			{chips.length > 1 ? (
				<button type="button" className="px-1.5 text-[13px] text-primary hover:underline" onClick={clearAll}>
					Clear all
				</button>
			) : null}
		</div>
	) : null;

	return (
		<div className="max-w-[900px]">
			{isMobile ? (
				<div className="mb-5 flex flex-col gap-3">
					{canViewAll ? <div className="flex">{scopeSwitch}</div> : null}
					<div className="flex items-center gap-2">
						{searchBox}
						{filterButton}
					</div>
					{canViewAll ? null : scopeSwitch}
					{chipRow}
				</div>
			) : (
				<div className="mb-6 flex flex-wrap items-center gap-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						{searchBox}
						{filterButton}
						{chipRow}
					</div>
					{scopeSwitch}
				</div>
			)}

			<div aria-busy={feed.isFetching} aria-live="polite">
				{feed.isError || filtersQuery.isError ? (
					<div role="alert" className="rounded-lg border p-6 text-sm">
						<p className="font-medium">Activity could not be loaded.</p>
						<p className="mt-1 text-muted-foreground">Check your connection and try again.</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-3"
							onClick={() => {
								void filtersQuery.refetch();
								void feed.refetch();
							}}
						>
							Try again
						</Button>
					</div>
				) : feed.isPending ? (
					<FeedSkeleton />
				) : !items.length ? (
					activeFilterCount || hasQuery ? (
						<EmptyState
							icon={<Search className="size-5" />}
							title="No activity matches"
							body={
								scope === "mine"
									? "Nothing you did matches these filters."
									: "Try a wider date range or fewer activity types."
							}
							action={
								<Button type="button" variant="outline" size="sm" onClick={clearAll}>
									Clear filters
								</Button>
							}
						/>
					) : (
						<EmptyState
							icon={<Activity className="size-5" />}
							title="No activity yet"
							body="Taking attendance, receiving payments and enrolling students will show up here as they happen."
						/>
					)
				) : (
					<div className={cn(feed.isPlaceholderData && "opacity-60 transition-opacity")}>
						{days.map((day) => {
							const heading = dayHeading(day.date);
							return (
								<section key={day.key} className="mb-7">
									<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b pb-2.5">
										<h3 className="flex items-baseline gap-2 text-base font-semibold">
											{heading.label}
											<span className="text-[13px] font-normal text-muted-foreground">
												{heading.sub}
											</span>
										</h3>
										<DaySummaryLine items={day.items} />
									</div>
									<div>
										{digestDay(day.items).map((entry) =>
											entry.kind === "single" ? (
												<SingleRow
													key={entry.id}
													item={entry.item}
													selected={params.activityId === entry.item.id}
													onOpen={() => openActivity(entry.item.id)}
													onStudentClick={goStudent}
												/>
											) : (
												<BurstRow
													key={entry.id}
													entry={entry}
													expanded={expanded.includes(entry.id)}
													selectedId={params.activityId}
													pillMax={isMobile ? 3 : 6}
													onToggle={() =>
														setExpanded((current) =>
															current.includes(entry.id)
																? current.filter((id) => id !== entry.id)
																: [...current, entry.id],
														)
													}
													onOpenBurst={() =>
														setBurst({ id: entry.id, type: entry.type, items: entry.items })
													}
													onOpenItem={(id) =>
														openActivity(id, { id: entry.id, type: entry.type, items: entry.items })
													}
												/>
											),
										)}
									</div>
								</section>
							);
						})}
						<div className="flex items-center gap-3 py-2">
							{feed.hasNextPage ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="min-h-11 md:min-h-9"
									disabled={feed.isFetchingNextPage}
									onClick={() => void feed.fetchNextPage()}
								>
									{feed.isFetchingNextPage ? (
										<>
											<Loader2 className="mr-1.5 size-4 animate-spin" />
											Loading…
										</>
									) : (
										"Load more"
									)}
								</Button>
							) : (
								<span className="text-[13px] text-muted-foreground">
									{items.length > 8 ? "That’s everything" : ""}
								</span>
							)}
							{feed.hasNextPage ? (
								<span className="text-[13px] text-muted-foreground">
									Showing {items.length}
								</span>
							) : null}
						</div>
					</div>
				)}
			</div>

			<ActivityDetailSheet
				activityId={params.activityId}
				onClose={() => {
					setBackToBurst(null);
					void setParams({ activityId: null });
				}}
				onOpenActivity={(id) => void setParams({ activityId: id })}
				onBack={
					backToBurst
						? () => {
								setBurst(backToBurst);
								setBackToBurst(null);
								void setParams({ activityId: null });
							}
						: undefined
				}
			/>
			<ActivityBurstSheet
				burst={burst}
				onClose={() => setBurst(null)}
				onOpenActivity={(id) => openActivity(id, burst)}
			/>

			<Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
				<SheetContent
					side="bottom"
					hideClose
					className="flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0"
				>
					<SheetHeader className="flex-row items-center gap-2 space-y-0 border-b px-4 py-3">
						<SheetTitle className="flex-1 text-base">Filters</SheetTitle>
						<SheetDescription className="sr-only">Filter activity</SheetDescription>
						{activeFilterCount ? (
							<Button type="button" variant="ghost" size="sm" onClick={clearAll}>
								Clear
							</Button>
						) : null}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-11"
							aria-label="Close"
							onClick={() => setMobileFilters(false)}
						>
							<X className="size-4" />
						</Button>
					</SheetHeader>
					<div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
							<div className="flex flex-wrap gap-2">
								{RANGE_OPTIONS.map((option) => (
									<button
										key={option.value}
										type="button"
										aria-pressed={(params.range ?? "any") === option.value}
										onClick={() => setRange(option.value)}
										className="min-h-10 rounded-full border px-3.5 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
									>
										{option.label}
									</button>
								))}
							</div>
							{params.range === "custom" ? (
								<CustomRangeInputs from={params.from} to={params.to} onChange={(next) => void setParams(next)} />
							) : null}
						</div>
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity type</p>
							<div className="divide-y rounded-lg border">
								{(filters?.categories ?? []).map((category) => {
									const categoryTypes = category.types.map((type) => type.type);
									const selected = categoryTypes.filter((type) => types.includes(type)).length;
									return (
										<div key={category.category}>
											<label className="flex min-h-12 items-center gap-3 px-3 font-semibold">
												<Checkbox
													checked={
														selected === categoryTypes.length ? true : selected ? "indeterminate" : false
													}
													onCheckedChange={() => toggleCategory(categoryTypes)}
												/>
												<span className={cn("size-2 rounded-full", ACTIVITY_CATEGORY_STYLES[category.category]?.dot)} />
												{category.label}
											</label>
											{category.types.map((type) => (
												<label key={type.type} className="flex min-h-11 items-center gap-3 pl-10 pr-3 text-sm">
													<Checkbox
														checked={types.includes(type.type)}
														onCheckedChange={() => toggleType(type.type)}
													/>
													{type.label}
												</label>
											))}
										</div>
									);
								})}
							</div>
						</div>
						{canViewAll && scope === "all" && filters?.members?.length ? (
							<div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member</p>
								<div className="divide-y rounded-lg border">
									{filters.members.map((member) => (
										<label key={member.userId} className="flex min-h-12 items-center gap-3 px-3 text-sm">
											<Checkbox
												checked={memberIds.includes(member.userId)}
												onCheckedChange={() => toggleMember(member.userId)}
											/>
											<ActivityAvatar name={member.name} userId={member.userId} size="sm" />
											<span className="flex-1 truncate">{member.name}</span>
											<span className="text-xs capitalize text-muted-foreground">
												{member.role?.toLowerCase() ?? ""}
											</span>
										</label>
									))}
								</div>
							</div>
						) : null}
					</div>
					<div className="border-t px-4 py-3">
						<Button type="button" className="h-11 w-full" onClick={() => setMobileFilters(false)}>
							Show activity
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

function CustomRangeInputs({
	from,
	to,
	onChange,
}: {
	from: string | null;
	to: string | null;
	onChange: (next: { from?: string | null; to?: string | null }) => void;
}) {
	const today = localDayKey(new Date());
	return (
		<div className="grid grid-cols-2 gap-2 p-2">
			<label className="text-xs text-muted-foreground">
				From
				<Input
					type="date"
					value={from ?? ""}
					max={to ?? today}
					onChange={(event) => onChange({ from: event.target.value || null })}
					onKeyDown={(event) => event.stopPropagation()}
					className="mt-1 h-10"
				/>
			</label>
			<label className="text-xs text-muted-foreground">
				To
				<Input
					type="date"
					value={to ?? ""}
					min={from ?? undefined}
					max={today}
					onChange={(event) => onChange({ to: event.target.value || null })}
					onKeyDown={(event) => event.stopPropagation()}
					className="mt-1 h-10"
				/>
			</label>
		</div>
	);
}

function DaySummaryLine({ items }: { items: ActivityFeedItem[] }) {
	const summary = summarizeDay(items);
	const bit = (value: number, singular: string, plural: string) => (
		<span>
			<b className="font-semibold tabular-nums text-foreground">{value}</b>{" "}
			{value === 1 ? singular : plural}
		</span>
	);
	return (
		<div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-[12.5px] text-muted-foreground md:ml-auto">
			{bit(summary.activities, "activity", "activities")}
			{bit(summary.people, "person", "people")}
			{summary.registers ? bit(summary.registers, "register", "registers") : null}
			{summary.moneyIn ? (
				<span>
					<span className={cn(activityPartClasses.amountPositive, "text-xs")}>
						{formatActivityAmount(summary.moneyIn)}
					</span>{" "}
					in
				</span>
			) : null}
			{summary.moneyOut ? (
				<span>
					<span className={cn(activityPartClasses.amountNegative, "text-xs")}>
						−{formatActivityAmount(summary.moneyOut)}
					</span>{" "}
					out
				</span>
			) : null}
		</div>
	);
}

const rowMainClass =
	"-mx-2 -my-1 min-w-0 cursor-pointer rounded-md px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

function SingleRow({
	item,
	selected,
	onOpen,
	onStudentClick,
}: {
	item: ActivityFeedItem;
	selected: boolean;
	onOpen: () => void;
	onStudentClick: (id: string) => void;
}) {
	return (
		<div className="grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 border-b py-3 md:gap-3">
			<ActivityAvatar name={item.actor.name} userId={item.actor.userId} className="mt-px" />
			{/* biome-ignore lint/a11y/useSemanticElements: row contains nested student buttons */}
			<div
				role="button"
				tabIndex={0}
				className={cn(rowMainClass, selected && "bg-accent")}
				onClick={onOpen}
				onKeyDown={(event) => {
					if (event.target !== event.currentTarget) return;
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onOpen();
					}
				}}
			>
				<ActivityParts
					parts={item.parts}
					onStudentClick={onStudentClick}
					className="text-sm leading-relaxed md:text-sm max-md:text-[14.5px]"
				/>
				<ActivityMeta>
					{[
						<span key="t" className="font-mono text-xs">
							{formatActivityTime(item.createdAt)}
						</span>,
						item.label,
					]}
				</ActivityMeta>
			</div>
		</div>
	);
}

function BurstRow({
	entry,
	expanded,
	selectedId,
	pillMax,
	onToggle,
	onOpenBurst,
	onOpenItem,
}: {
	entry: Extract<DigestEntry<ActivityFeedItem>, { kind: "burst" }>;
	expanded: boolean;
	selectedId: string | null;
	pillMax: number;
	onToggle: () => void;
	onOpenBurst: () => void;
	onOpenItem: (id: string) => void;
}) {
	const first = entry.items[0] as ActivityFeedItem;
	return (
		<div className="grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 border-b py-3 md:gap-3">
			<ActivityAvatar name={first.actor.name} userId={first.actor.userId} className="mt-px" />
			<div className="min-w-0">
				<button type="button" className={cn(rowMainClass, "block w-[calc(100%+1rem)]")} onClick={onOpenBurst}>
					<BurstSentence
						type={entry.type}
						items={entry.items}
						label={first.label}
						className="text-sm leading-relaxed max-md:text-[14.5px]"
					/>
					<BurstPills type={entry.type} items={entry.items} max={pillMax} />
				</button>
				<ActivityMeta className="mt-1.5">
					{[
						<span key="t" className="font-mono text-xs">
							{burstTimeRange(entry.items)}
						</span>,
						first.label,
						<button
							key="x"
							type="button"
							className="inline-flex min-h-8 items-center gap-0.5 text-[12.5px] font-medium text-primary"
							aria-expanded={expanded}
							onClick={onToggle}
						>
							{expanded ? "Hide" : `Show ${entry.items.length}`}
							{expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
						</button>,
					]}
				</ActivityMeta>
				{expanded ? (
					<ol className="mt-2.5 grid gap-px border-l-2 pl-3">
						{entry.items.map((item) => (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => onOpenItem(item.id)}
									className={cn(
										"grid min-h-10 w-full grid-cols-[52px_minmax(0,1fr)] items-start gap-2 rounded-[5px] px-2 py-1.5 text-left text-[13px] hover:bg-muted md:min-h-0",
										selectedId === item.id && "bg-accent",
									)}
								>
									<span className="pt-px font-mono text-xs text-muted-foreground">
										{formatActivityTime(item.createdAt)}
									</span>
									<ActivityParts parts={item.parts.slice(1)} plain />
								</button>
							</li>
						))}
					</ol>
				) : null}
			</div>
		</div>
	);
}

function EmptyState({
	icon,
	title,
	body,
	action,
}: {
	icon: React.ReactNode;
	title: string;
	body: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-14 text-center">
			<div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</div>
			<p className="mt-3 font-medium">{title}</p>
			<p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}

function FeedSkeleton() {
	return (
		<div role="status" aria-label="Loading activity">
			<div className="flex items-baseline gap-3 border-b pb-2.5">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="ml-auto h-4 w-48" />
			</div>
			{Array.from({ length: 6 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
				<div key={index} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 border-b py-3">
					<Skeleton className="size-[30px] rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-4/5" />
						<Skeleton className="h-3 w-32" />
					</div>
				</div>
			))}
		</div>
	);
}
