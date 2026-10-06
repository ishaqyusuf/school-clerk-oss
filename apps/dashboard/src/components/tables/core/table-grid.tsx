"use client";

import { cn } from "@school-clerk/ui/cn";
import type { Row } from "@tanstack/react-table";
import type { RefObject, ReactNode } from "react";

interface TableGridProps<TData> {
	rows: Row<TData>[];
	scrollRef: RefObject<HTMLDivElement | null>;
	renderItem: (row: Row<TData>) => ReactNode;
	className?: string;
	contentClassName?: string;
	height?: string;
	isFetchingNextPage?: boolean;
}

export function TableGrid<TData>({
	rows,
	scrollRef,
	renderItem,
	className,
	contentClassName,
	height,
	isFetchingNextPage = false,
}: TableGridProps<TData>) {
	return (
		<div
			ref={scrollRef}
			className={cn(
				"border-b border-l border-r border-border scrollbar-hide",
				height ? "overflow-auto overscroll-contain" : "overflow-x-auto",
				className,
			)}
			style={{ height }}
		>
			<div
				className={cn(
					"grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]",
					contentClassName,
				)}
			>
				{rows.map((row) => renderItem(row))}
			</div>
			{isFetchingNextPage ? (
				<div className="px-3 pb-4 text-center text-xs text-muted-foreground">
					Loading more...
				</div>
			) : null}
		</div>
	);
}
