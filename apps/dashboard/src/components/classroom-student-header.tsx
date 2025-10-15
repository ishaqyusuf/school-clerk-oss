"use client";
import { SearchFilter } from "@school-clerk/ui/custom/search-filter/index";
import { OpenClassroomSheet } from "./open-classroom-sheet";
import { classroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "./icons";
import { useClassroomParams } from "@/hooks/use-classroom-params";

export function ClassroomStudentHeader({}) {
  const { setParams } = useClassroomParams();
  return (
    <div className="flex justify-between">
      {/* <SearchFilter
        filterSchema={classroomFilterParams}
        placeholder="Search Classrooms..."
        trpcRoute={trpc.filters.classroom}
      /> */}
      <div className="flex-1"></div>
      <Button
        onClick={(e) => {
          setParams({
            secondaryTab: "student-form",
          });
        }}
      >
        <Icons.add className="size-4" />
        <span>Add</span>
      </Button>
    </div>
  );
}
