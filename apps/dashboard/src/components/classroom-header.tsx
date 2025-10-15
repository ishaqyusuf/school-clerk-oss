"use client";
import { SearchFilter } from "@school-clerk/ui/custom/search-filter/index";
import { OpenClassroomSheet } from "./open-classroom-sheet";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useTRPC } from "@/trpc/client";

export function ClassroomHeader({}) {
  const trpc = useTRPC();
  return (
    <div className="flex justify-between">
      <SearchFilter
        filterSchema={classroomFilterParams}
        placeholder="Search Classrooms..."
        trpcRoute={trpc.filters.classroom}
      />
      <div className="flex-1"></div>
      <OpenClassroomSheet />
    </div>
  );
}
