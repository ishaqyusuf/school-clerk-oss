"use client";
import { SearchFilter } from "@school-clerk/ui/search-filter";
import { OpenClassroomSheet } from "./open-classroom-sheet";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useTRPC } from "@/trpc/client";
import { useQueryStates } from "nuqs";
import { _trpc } from "./static-trpc";

export function ClassroomHeader({}) {
  const [filters, setFilters] = useQueryStates(classroomFilterParams);
  return (
    <div className="flex justify-between">
      <SearchFilter
        filterSchema={classroomFilterParams}
        placeholder="Search Classrooms..."
        trpcRoute={_trpc.filters.classroom}
        trpQueryOptions={{}}
        {...{ filters, setFilters }}
      />
      <div className="flex-1"></div>
      <OpenClassroomSheet />
    </div>
  );
}
