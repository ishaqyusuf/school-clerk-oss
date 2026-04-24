"use client";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { studentFilterParamsSchema } from "@/hooks/use-student-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@/types";
import { useQuery } from "@tanstack/react-query";
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
	const { data: trpcFilterData } = useQuery({
		enabled: shouldFetch,
		...trpc.students.filters.queryOptions(),
	});
	return (
		<>
			<SearchFilter
				filterList={(trpcFilterData ?? []) as PageFilterData[]}
				placeholder="Search students..."
			/>
		</>
	);
}
