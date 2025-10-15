"use client";
import { SearchFilter } from "@school-clerk/ui/custom/search-filter/index";
import { OpenSubjectSheet } from "./open-subject-sheet";
import { subjectFilterParams } from "@/hooks/use-subject-filter-params";
import { useTRPC } from "@/trpc/client";

export function SubjectHeader({}) {
  const trpc = useTRPC();
  return (
    <div className="flex justify-between">
      <SearchFilter
        filterSchema={subjectFilterParams}
        placeholder="Search Subjects..."
        trpcRoute={trpc.filters.subject}
      />
      <div className="flex-1"></div>
      <OpenSubjectSheet />
    </div>
  );
}
