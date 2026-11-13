"use client";

import { useStudentParams } from "@/hooks/use-student-params";
import { cn } from "@school-clerk/ui/cn";
import type { ReactNode } from "react";

type Props = {
  studentId?: string | null;
  termId?: string | null;
  termSheetId?: string | null;
  label: string;
  className?: string;
  children: ReactNode;
};

/**
 * Wraps a student-name cell so clicking it opens the global student overview
 * sheet on that student's academics for the given term. Renders the children
 * unchanged when the student id is unknown.
 */
export function StudentOverviewTrigger({
  studentId,
  termId,
  termSheetId,
  label,
  className,
  children,
}: Props) {
  const { setParams } = useStudentParams();

  if (!studentId) return <>{children}</>;

  return (
    <button
      type="button"
      aria-label={`Open ${label} overview`}
      title="Open student overview"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center rounded-sm text-start outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() =>
        setParams({
          studentViewId: studentId,
          studentViewTab: "academics",
          studentViewTermId: termId ?? null,
          studentTermSheetId: termSheetId ?? null,
        })
      }
    >
      {children}
    </button>
  );
}
