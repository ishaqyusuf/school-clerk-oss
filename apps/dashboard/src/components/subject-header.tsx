"use client";
import { SearchFilter } from "@school-clerk/ui/custom/search-filter/index";
import { OpenSubjectSheet } from "./open-subject-sheet";
import {
  subjectFilterParams,
  useSubjectFilterParams,
} from "@/hooks/use-subject-filter-params";
import { useTRPC } from "@/trpc/client";

export function SubjectHeader({}) {
  const trpc = useTRPC();
  const { filters, setFilters } = useSubjectFilterParams();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:flex-1">
        <SearchFilter
          filterSchema={subjectFilterParams}
          placeholder="Search subjects..."
          trpcRoute={trpc.filters.subject}
          filterList={[]}
          {...{ filters, setFilters }}
        />
      </div>
      <div className="self-end sm:self-auto">
        <OpenSubjectSheet />
      </div>
    </div>
  );
}
