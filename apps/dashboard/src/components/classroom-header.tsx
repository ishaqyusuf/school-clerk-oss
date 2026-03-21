"use client";
import { SearchFilter } from "@school-clerk/ui/search-filter";
import { OpenClassroomSheet } from "./open-classroom-sheet";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useTRPC } from "@/trpc/client";
import { useQueryStates } from "nuqs";
import { _trpc } from "./static-trpc";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { useClassroomParams } from "@/hooks/use-classroom-params";

export function ClassroomHeader({}) {
  const [filters, setFilters] = useQueryStates(classroomFilterParams);
  const { setParams } = useClassroomParams();
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
      <div className="flex-1 w-full sm:w-auto">
        <SearchFilter
          filterSchema={classroomFilterParams}
          placeholder="Search by class name..."
          trpcRoute={_trpc.filters.classroom}
          trpQueryOptions={{}}
          {...{ filters, setFilters }}
        />
      </div>
      <Button
        className="gap-2 shadow-sm"
        onClick={() => setParams({ createClassroom: true })}
      >
        <Icons.Add className="h-4 w-4" />
        Add Classroom
      </Button>
    </div>
  );
}
