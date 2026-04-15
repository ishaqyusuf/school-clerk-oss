import { createContext, useContext, useMemo } from "react";
import { useStudentReportFilterParams } from "./use-student-report-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQuery, useQueries } from "@tanstack/react-query";
import { classroomDisplayName } from "@school-clerk/utils";
import { buildStudentReportsById } from "@/features/student-report/report-model";
type ReportPageContext = ReturnType<typeof createReportPageContext>;
export const ReportPageContext = createContext<ReportPageContext>(undefined);
export const ReportPageProvider = ReportPageContext.Provider;
export const createReportPageContext = (defaultTermId?: string) => {
  const { filters } = useStudentReportFilterParams();
  // Use the URL param when present; fall back to the cookie term from the
  // server so queries fire immediately on first render without a round-trip.
  const effectiveTermId = filters.termId ?? defaultTermId ?? null;

  // Collect all department IDs to load:
  // current department + any that have been activated via multi-class selection
  const deptsToLoad = useMemo(() => {
    const depts = new Set<string>();
    if (filters.departmentId) depts.add(filters.departmentId);
    filters.activeDepts?.forEach((d) => {
      if (d) depts.add(d);
    });
    return Array.from(depts).filter(Boolean);
  }, [filters.departmentId, filters.activeDepts]);

  // Fetch report sheets for all active departments in parallel
  const deptQueries = useQueries({
    queries: deptsToLoad.map((deptId) =>
      _trpc.assessments.getClassroomReportSheet.queryOptions(
        {
          departmentId: deptId,
          sessionTermId: effectiveTermId,
        },
        {
          enabled: !!deptId && !!effectiveTermId,
        },
      ),
    ),
  });

  // Current department's data (for sidebar display)
  const currentDeptIndex = deptsToLoad.indexOf(filters.departmentId ?? "");
  const reportData =
    currentDeptIndex >= 0 ? deptQueries[currentDeptIndex]?.data : undefined;

  // Build a flat map of termFormId -> studentTermForm across all loaded depts
  const allTermForms = useMemo(() => {
    return deptQueries.flatMap((q) => q.data?.studentTermForms ?? []);
  }, [deptQueries]);

  // Map from departmentId to its report data (for lookup in Reports component)
  const reportDataByDept = useMemo(() => {
    return Object.fromEntries(
      deptsToLoad.map((deptId, i) => [deptId, deptQueries[i]?.data]),
    );
  }, [deptsToLoad, deptQueries]);

  const { data: classRooms } = useQuery(
    _trpc.classrooms.all.queryOptions({
      sessionTermId: effectiveTermId,
    }),
  );
  const normalizedClassroomName = classroomDisplayName({
    className: classRooms?.data?.find((room) => room.id === filters.departmentId)?.classRoom
      ?.name,
    departmentName: reportData?.departmentName,
  });

  // Build combined reportsById from all loaded departments
  const calculatedReport = useMemo(() => {
    return {
      reportsById: buildStudentReportsById({
        departmentSheets: deptQueries
          .map((q) => q.data)
          .filter(Boolean) as Array<(typeof deptQueries)[number]["data"]>,
        classrooms: classRooms?.data,
      }),
    };
  }, [classRooms?.data, deptQueries]);

  return {
    classroomName: normalizedClassroomName,
    termForms: reportData?.studentTermForms,
    allTermForms,
    reportsById: calculatedReport?.reportsById,
    classRooms: classRooms?.data,
    reportData,
  };
};
export const useReportPageContext = () => {
  const context = useContext(ReportPageContext);
  if (context === undefined) {
    throw new Error(
      "useReportPageContext must be used within a ReportPageProvider",
    );
  }
  return context;
};
