"use client";
import { ClassroomResultTable } from "@/components/classroom-result-table";
import { PrintSelectionFooter } from "@/components/print-selection-footer";
import { StudentReportPage } from "@/components/student-report-page";
import {
  createReportPageContext,
  ReportPageProvider,
  useReportPageContext,
} from "@/hooks/use-report-page";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { useQuery } from "@tanstack/react-query";
import { FolderX, PanelRightOpen } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

function PageTitleSync() {
  const ctx = useReportPageContext();
  useEffect(() => {
    const base = "Student Report";
    document.title = ctx.classroomName ? `${ctx.classroomName} — ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [ctx.classroomName]);
  return null;
}

export function StudentReportView({
  defaultTermId,
  defaultClassroomLayout,
}: {
  defaultTermId: string;
  defaultClassroomLayout: "ltr" | "rtl";
}) {
  const { filters } = useStudentReportFilterParams();

  return (
    <ReportPageProvider value={createReportPageContext(defaultTermId)}>
      <StudentReportFilterDefaults defaultTermId={defaultTermId} />
      <PageTitleSync />
      <div className={cn("min-h-screen print:hidden")}>
        <div className="flex min-h-screen flex-col">
          <ReportContent
            filters={filters}
            defaultClassroomLayout={defaultClassroomLayout}
          />
        </div>
      </div>
      {/* Sticky footer — only shown when students are selected */}
      <PrintSelectionFooter />
      <div className="hidden flex-col print:flex">
        <Reports printMode />
      </div>
    </ReportPageProvider>
  );
}

function StudentReportFilterDefaults({ defaultTermId }: { defaultTermId: string }) {
  const ctx = useReportPageContext();
  const { filters, setFilters } = useStudentReportFilterParams();
  const lastPatchRef = useRef("");
  const { data: terms } = useQuery(
    _trpc.academics.getReportTerms.queryOptions(),
  );

  useEffect(() => {
    const patch: Partial<typeof filters> = {};
    const termsLoaded = !!terms;
    const hasValidTerm = (termId?: string | null) =>
      !!termId && !!terms?.some((term) => term.id === termId);
    const nextTermId = termsLoaded
      ? hasValidTerm(filters.termId)
        ? filters.termId
        : hasValidTerm(defaultTermId)
          ? defaultTermId
          : (terms?.[0]?.id ?? null)
      : (filters.termId ?? defaultTermId ?? null);

    if ((filters.termId ?? null) !== nextTermId) {
      patch.termId = nextTermId;
      patch.departmentId = null;
      patch.deptId = null;
      patch.printOrder = [];
      patch.activeDepts = [];
    }

    if (patch.termId === undefined && !ctx.classRooms) {
      if (filters.deptId && filters.departmentId !== filters.deptId) {
        patch.departmentId = filters.deptId;
      }
    } else if (patch.termId === undefined) {
      const classrooms = ctx.classRooms;
      const isValidDepartment = (departmentId?: string | null) =>
        !!departmentId &&
        !!classrooms?.some((classroom) => classroom.id === departmentId);
      const hasValidDepartment = isValidDepartment(filters.departmentId);
      const hasValidDeptAlias = isValidDepartment(filters.deptId);
      const nextDepartmentId = hasValidDepartment
        ? filters.departmentId
        : hasValidDeptAlias
          ? filters.deptId
          : (classrooms?.[0]?.id ?? null);

      if ((filters.departmentId ?? null) !== nextDepartmentId) {
        patch.departmentId = nextDepartmentId;
      }

      if (filters.deptId) {
        patch.deptId = null;
      }
    }

    if (!Object.keys(patch).length) {
      lastPatchRef.current = "";
      return;
    }

    const patchKey = JSON.stringify({
      activeDepts: patch.activeDepts,
      departmentId: patch.departmentId,
      deptId: patch.deptId,
      printOrder: patch.printOrder,
      termId: patch.termId,
    });
    if (lastPatchRef.current === patchKey) return;

    lastPatchRef.current = patchKey;
    setFilters(patch);
  }, [
    ctx.classRooms,
    defaultTermId,
    filters.departmentId,
    filters.deptId,
    filters.termId,
    setFilters,
    terms,
  ]);

  return null;
}

function ReportContent({
  filters,
  defaultClassroomLayout,
}: {
  filters: ReturnType<typeof useStudentReportFilterParams>["filters"];
  defaultClassroomLayout: "ltr" | "rtl";
}) {
  const ctx = useReportPageContext();

  // A department is chosen but the report sheet has no subjects/assessments
  // configured for this term → show the full-screen unavailable state.
  const unavailable =
    !!filters.departmentId &&
    !ctx.reportData?.subjects?.length &&
    // Don't flash while the query is still loading
    ctx.reportData !== undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 p-4">
        {unavailable ? (
          <ReportUnavailable />
        ) : (
          <ClassroomResultTable defaultClassroomLayout={defaultClassroomLayout} />
        )}
      </div>
    </div>
  );
}

function ReportUnavailable({ compact = false }: { compact?: boolean }) {
  const { filters } = useStudentReportFilterParams();
  const { setParams } = useClassroomParams();
  const openClassroomOverview = () => {
    if (!filters.departmentId) return;

    setParams({
      viewClassroomId: filters.departmentId,
      classroomTab: "subjects",
    });
  };

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center h-full gap-6 text-center px-6",
        compact ? "min-h-[50vh]" : "min-h-[70vh]",
      )}
    >
      <div className="flex items-center justify-center size-20 rounded-full bg-muted">
        <FolderX className="size-10 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-semibold tracking-tight">
          Report Not Available
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No assessment results have been recorded for this classroom in the
          selected term. Assessments may not have been configured or scores have
          not yet been entered.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={!filters.departmentId}
        onClick={openClassroomOverview}
      >
        <PanelRightOpen className="size-4" />
        Open classroom overview
      </Button>
    </div>
  );
}

function Reports({ printMode = false }) {
  const ctx = useReportPageContext();
  const { filters } = useStudentReportFilterParams();

  // Use printOrder (ordered termFormIds) — persists across classroom switches
  const printOrder = filters.printOrder ?? [];

  // Filter to IDs that have loaded report data
  const studentIds = useMemo(() => {
    return printOrder.filter((id) => !!ctx.reportsById?.[id]);
  }, [printOrder, ctx.reportsById]);

  return (
    <>
      {studentIds?.map((studentId, i) => (
        <div
          key={studentId}
          className={cn(
            !printMode
              ? "shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
              : "",
            i > 0 && printMode && "break-before-page ",
          )}
        >
          <StudentReportPage studentId={studentId} key={studentId} />
        </div>
      ))}
    </>
  );
}
