"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { cn } from "@school-clerk/ui/cn";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@school-clerk/ui/item";
import { Skeleton } from "@school-clerk/ui/skeleton";
import type { Row, Table } from "@tanstack/react-table";
import { type ReactNode, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { RowSelectCheckbox, SelectAllCheckbox } from "./selection";

export type CollectionView = "list" | "cards";

export type DirectoryRecordDetail = {
	label: string;
	value: ReactNode;
};

/** Count line plus, outside Table view, a select-all for the loaded rows. */
export function DirectoryToolbar<TData>({
	table,
	view,
	selectAllLabel,
	disabled = false,
	summary,
	children,
}: {
	/** Omit for directories without selection. */
	table?: Table<TData>;
	view: CollectionView | "table";
	selectAllLabel?: string;
	disabled?: boolean;
	summary: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
			<div className="flex min-w-0 flex-wrap items-center gap-3">
				{view !== "table" && table ? (
					<div className="flex items-center gap-2 text-sm">
						<SelectAllCheckbox
							table={table}
							label={selectAllLabel ?? "Select all loaded rows"}
							disabled={disabled}
						/>
						Select all
					</div>
				) : null}
				<p
					className="text-sm text-muted-foreground"
					aria-live="polite"
					dir="auto"
				>
					{summary}
				</p>
			</div>
			{children ? (
				<div className="flex flex-wrap items-center gap-2">{children}</div>
			) : null}
		</div>
	);
}

export function DirectoryCollection({
	view,
	label,
	children,
}: {
	view: CollectionView;
	label: string;
	children: ReactNode;
}) {
	return view === "cards" ? (
		<ul
			aria-label={`${label} cards`}
			className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3"
		>
			{children}
		</ul>
	) : (
		<ItemGroup aria-label={`${label} list`} className="gap-2">
			{children}
		</ItemGroup>
	);
}

export function DirectoryCollectionSkeleton({ label }: { label: string }) {
	return (
		<div aria-label={`Loading ${label}`} className="flex flex-col gap-3">
			{["first", "second", "third"].map((key) => (
				<Skeleton key={key} className="h-24 w-full" />
			))}
		</div>
	);
}

/**
 * Loads the next page when it scrolls into view. Collections are not
 * virtualized, so this replaces the table's virtual-row threshold.
 */
export function CollectionLoadMore({
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
}: {
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
}) {
	const { ref, inView } = useInView({ rootMargin: "400px 0px" });
	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) onLoadMore();
	}, [inView, hasNextPage, isFetchingNextPage, onLoadMore]);
	if (!hasNextPage) return null;
	return (
		<div ref={ref} className="py-3 text-center text-xs text-muted-foreground">
			{isFetchingNextPage ? "Loading more…" : null}
		</div>
	);
}

function RecordDetails({ details }: { details: DirectoryRecordDetail[] }) {
	if (!details.length) return null;
	return (
		<dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
			{details.map((detail) => (
				<div key={detail.label} className="min-w-0">
					<dt className="text-xs text-muted-foreground">{detail.label}</dt>
					<dd className="break-words" dir="auto">
						{detail.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * One record as an Item (list) or Card (cards). Pass `row` and `selectLabel`
 * to make it selectable. `onOpen` turns the title into the record's primary
 * navigation control.
 */
export function DirectoryRecord<TData>({
	row,
	view,
	selectLabel,
	media,
	title,
	description,
	badges,
	highlight,
	details = [],
	actions,
	onOpen,
}: {
	row?: Row<TData>;
	view: CollectionView;
	selectLabel?: string;
	/** Optional avatar, thumbnail or icon shown beside the title. */
	media?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	badges?: ReactNode;
	/** The one figure that drives action (e.g. a student count), shown at the end. */
	highlight?: DirectoryRecordDetail;
	details?: DirectoryRecordDetail[];
	actions?: ReactNode;
	onOpen?: () => void;
}) {
	const selected = row?.getIsSelected() ? "selected" : undefined;
	const checkbox =
		row && selectLabel ? (
			<RowSelectCheckbox row={row} label={selectLabel} />
		) : null;
	const heading = onOpen ? (
		<button
			type="button"
			className="min-w-0 text-start underline-offset-4 outline-none hover:underline focus-visible:underline"
			onClick={onOpen}
		>
			{title}
		</button>
	) : (
		title
	);
	const badgeRow = badges ? (
		<div className="flex flex-wrap gap-2">{badges}</div>
	) : null;
	const headline = highlight ? (
		<div className="ms-auto shrink-0 text-end">
			<p className="text-xs text-muted-foreground">{highlight.label}</p>
			<p className="text-lg font-semibold tabular-nums">{highlight.value}</p>
		</div>
	) : null;

	if (view === "cards")
		return (
			<li className="min-w-0">
				<Card
					data-state={selected}
					className="flex h-full min-w-0 flex-col data-[state=selected]:bg-muted/60"
				>
					<CardHeader className="flex-row items-start gap-3 space-y-0 p-4">
						{media ? <div className="shrink-0">{media}</div> : null}
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<CardTitle className="min-w-0 break-words text-base font-semibold">
								{heading}
							</CardTitle>
							{description ? (
								<CardDescription className="min-w-0 break-words" dir="auto">
									{description}
								</CardDescription>
							) : null}
						</div>
						{checkbox ? <div className="shrink-0">{checkbox}</div> : null}
					</CardHeader>
					{badgeRow || headline || details.length ? (
						<CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
							{badgeRow || headline ? (
								<div className="flex flex-wrap items-end gap-3">
									{badgeRow}
									{headline}
								</div>
							) : null}
							<RecordDetails details={details} />
						</CardContent>
					) : null}
					{actions ? (
						<CardFooter className="mt-auto flex-wrap gap-2 border-t px-4 py-3">
							{actions}
						</CardFooter>
					) : null}
				</Card>
			</li>
		);

	return (
		<Item
			role="listitem"
			variant="outline"
			size="sm"
			data-state={selected}
			className={cn("rounded-none data-[state=selected]:bg-muted/60")}
		>
			{checkbox ? <ItemMedia>{checkbox}</ItemMedia> : null}
			{media ? <ItemMedia>{media}</ItemMedia> : null}
			<ItemContent className="min-w-0 basis-48">
				<ItemTitle className="max-w-full break-words">{heading}</ItemTitle>
				{description ? (
					<ItemDescription className="break-words" dir="auto">
						{description}
					</ItemDescription>
				) : null}
				{badgeRow}
			</ItemContent>
			<RecordDetails details={details} />
			{headline}
			{actions ? (
				<ItemActions className="flex-wrap">{actions}</ItemActions>
			) : null}
		</Item>
	);
}
