"use client";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { studentFilterParamsSchema } from "@/hooks/use-student-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@/types";
import {
	filterTermsBySession,
	getEnrollmentFilterRemovalUpdate,
	getEnrollmentFilterSelectionUpdate,
} from "@/features/student-directory/student-enrollment-filter-model";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SearchFilter } from "./midday-search-filter/search-filter-md";

export function StudentSearchFilter() {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: studentFilterParamsSchema,
				},
			]}
		>
			<Content />
		</SearchFilterProvider>
	);
}
function Content() {
	const ctx = useSearchFilterContext();
	const { shouldFetch } = ctx;
	const trpc = useTRPC();
	const { data: trpcFilterData, isLoading, isError, refetch } = useQuery({
		enabled: shouldFetch,
		...trpc.students.filters.queryOptions(),
	});
	const filterList = useMemo(
		() =>
			filterTermsBySession(
				(trpcFilterData ?? []) as PageFilterData[],
				ctx.filters.sessionId,
			),
		[ctx.filters.sessionId, trpcFilterData],
	);
	return (
		<>
			<SearchFilter
				className="max-md:flex-col max-md:items-stretch max-md:gap-2 max-md:space-x-0 max-md:[&>form]:w-full"
				filterList={filterList}
        hasFilterSource
        loading={isLoading}
        error={isError ? "Could not load student filters." : undefined}
        onRetry={() => { void refetch(); }}
        resolveMobileFilters={(draft) => filterTermsBySession((trpcFilterData ?? []) as PageFilterData[], draft.sessionId as string | null)}
        onDraftOptionSelected={(draft, filter, option) => getEnrollmentFilterSelectionUpdate({ filterKey: filter.value, option, currentFilters: draft, filterList: (trpcFilterData ?? []) as PageFilterData[] })}
				placeholder="Search students..."
				onOptionSelected={(filter, option) => {
					const update = getEnrollmentFilterSelectionUpdate({
						filterKey: filter.value,
						option,
						currentFilters: ctx.filters,
						filterList: (trpcFilterData ?? []) as PageFilterData[],
					});
					if (!update) return false;

					ctx.setFilters(update);
					return true;
				}}
				onFilterRemove={(filterKey) =>
					getEnrollmentFilterRemovalUpdate(filterKey)
				}
			/>
		</>
	);
}
