"use client";

import { ClassroomResultTable } from "@/components/classroom-result-table";
import { StudentReportFilter } from "@/components/student-report-filters";
import {
  createReportPageContext,
  ReportPageProvider,
} from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { useEffect, useRef } from "react";

function TeacherReportSheetInner({
  defaultTermId,
  allowedClassroomIds,
  defaultClassroomLayout = "ltr",
}: {
  defaultTermId: string;
  allowedClassroomIds?: string[];
  defaultClassroomLayout?: "ltr" | "rtl";
}) {
  const { filters, setFilters } = useStudentReportFilterParams();
  const seededRef = useRef(false);

  // An empty array means "no classrooms assigned" (empty dropdown).
  // undefined means "unrestricted" (admin/academic view).
  const hasAllowedList = allowedClassroomIds !== undefined;

  useEffect(() => {
    // Always seed the term from the cookie when URL has none.
    // Do this before the seededRef guard so it applies on every mount.
    if (!filters.termId && defaultTermId) {
      setFilters({ termId: defaultTermId });
    }

    if (seededRef.current) return;

    if (!hasAllowedList) {
      seededRef.current = true;
      return;
    }

    if (allowedClassroomIds!.length === 0) {
      // Teacher has no assigned classrooms — clear any lingering departmentId.
      if (filters.departmentId) {
        setFilters({ departmentId: null });
      }
      seededRef.current = true;
      return;
    }

    if (!filters.departmentId) {
      // No classroom selected yet — default to the first assigned.
      setFilters({ departmentId: allowedClassroomIds![0] });
      seededRef.current = true;
      return;
    }

    if (!allowedClassroomIds!.includes(filters.departmentId)) {
      // Current classroom is not in the allowed list — replace with first assigned.
      setFilters({ departmentId: allowedClassroomIds![0] });
      seededRef.current = true;
      return;
    }

    seededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAllowedList]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-background p-4 shadow-sm">
        <StudentReportFilter
          controlsOnly
          allowedClassroomIds={allowedClassroomIds}
        />
      </div>
      <ClassroomResultTable defaultClassroomLayout={defaultClassroomLayout} />
    </div>
  );
}

export function TeacherReportSheet({
  defaultTermId,
  allowedClassroomIds,
  defaultClassroomLayout = "ltr",
}: {
  defaultTermId: string;
  allowedClassroomIds?: string[];
  defaultClassroomLayout?: "ltr" | "rtl";
}) {
  return (
    <ReportPageProvider value={createReportPageContext(defaultTermId)}>
      <TeacherReportSheetInner
        defaultTermId={defaultTermId}
        allowedClassroomIds={allowedClassroomIds}
        defaultClassroomLayout={defaultClassroomLayout}
      />
    </ReportPageProvider>
  );
}
