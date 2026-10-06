"use client";

import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import type { PageFilterData } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { type Parser, parseAsString } from "nuqs";
import { SearchFilter } from "./search-filter-md";

type Props = {
	defaultSearch?: Record<string, unknown>;
	placeholder?: string;
	filterList?: PageFilterData[];
	trpcFilter?: { queryOptions: () => object };
	filterSchema?: Record<string, Parser<unknown>>;
};

export function MiddaySearchFilter(props: Props) {
	return (
		<SearchFilterProvider
			args={[{ filterSchema: props.filterSchema ?? { search: parseAsString } }]}
		>
			<Content {...props} />
		</SearchFilterProvider>
	);
}

function Content({ trpcFilter, filterList, ...props }: Props) {
	const { shouldFetch } = useSearchFilterContext();
	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ["midday-search-filter", "empty"],
		queryFn: async (): Promise<PageFilterData[]> => [],
		...trpcFilter?.queryOptions(),
		enabled: Boolean(trpcFilter) && shouldFetch,
	});
	return (
		<SearchFilter
			{...props}
			hasFilterSource={Boolean(trpcFilter)}
			filterList={filterList ?? data ?? []}
			debounceSearch
			loading={Boolean(trpcFilter) && isLoading}
			error={isError ? "Could not load filters." : undefined}
			onRetry={() => {
				void refetch();
			}}
		/>
	);
}
