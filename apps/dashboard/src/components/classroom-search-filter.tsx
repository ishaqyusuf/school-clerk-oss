"use client";
import { SearchFilterProvider } from "@school-clerk/ui/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "@school-clerk/ui/search-filter";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useQueryStates } from "nuqs";

export function ClassroomSearchFilter() {
  const [filters, setFilters] = useQueryStates(classroomFilterParams);

  return (
    <SearchFilterProvider
      args={[
        {
          filterSchema: classroomFilterParams,
          filters,
          setFilters,
        },
      ]}
    >
      <Content filters={filters} setFilters={setFilters} />
    </SearchFilterProvider>
  );
}

function Content({ filters, setFilters }) {
  const trpc = useTRPC();
  const { data: trpcFilterData } = useQuery({
    ...trpc.filters.classroom.queryOptions(),
  });

  return (
    <>
      <SearchFilterTRPC
        placeholder={"Search Classrooms..."}
        filterList={trpcFilterData}
        filters={filters}
        setFilters={setFilters}
      />
    </>
  );
}
