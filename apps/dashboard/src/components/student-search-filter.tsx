"use client";
import { useTRPC } from "@/trpc/client";
import { studentFilterParamsSchema } from "@/hooks/use-student-filter-params";
import {
  SearchFilterProvider,
  useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { SearchFilter } from "./midday-search-filter/search-filter-md";
import { useQuery } from "@tanstack/react-query";

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
function Content({}) {
  const ctx = useSearchFilterContext();
  const { shouldFetch } = ctx;
  const trpc = useTRPC();
  const { data: trpcFilterData } = useQuery({
    enabled: shouldFetch,
    ...trpc.students.filters.queryOptions(),
  });
  return (
    <>
      <SearchFilter filterList={trpcFilterData as any} />
    </>
  );
}
