"use client";
import { SearchFilterProvider } from "@school-clerk/ui/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "@school-clerk/ui/search-filter";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";

export function ClassroomSearchFilter() {
  return (
    <SearchFilterProvider
      args={[
        {
          filterSchema: classroomFilterParams,
        },
      ]}
    >
      <Content />
    </SearchFilterProvider>
  );
}

function Content({}) {
  const trpc = useTRPC();
  const { data: trpcFilterData } = useQuery({
    ...trpc.filters.classroom.queryOptions(),
  });

  return (
    <>
      <SearchFilterTRPC
        placeholder={"Search Classrooms..."}
        filterList={trpcFilterData}
      />
    </>
  );
}
