import { _trpc } from "@/components/static-trpc";
import { buildStudentReportsById } from "@/features/student-report/report-model";
import { classroomDisplayName } from "@school-clerk/utils";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo } from "react";
import { useStudentReportFilterParams } from "./use-student-report-filter-params";
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
    for (const d of filters.activeDepts ?? []) {
      if (d) depts.add(d);
    }
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
  const currentDeptQuery =
    currentDeptIndex >= 0 ? deptQueries[currentDeptIndex] : null;
  const reportData =
    currentDeptIndex >= 0 ? currentDeptQuery?.data : undefined;
  const reportError = currentDeptQuery?.error ?? null;
  const isReportLoading = Boolean(
    filters.departmentId &&
      effectiveTermId &&
      currentDeptQuery &&
      (currentDeptQuery.isLoading || currentDeptQuery.isFetching),
  );
  const refetchReportData = useCallback(() => {
    void currentDeptQuery?.refetch();
  }, [currentDeptQuery]);

  // Build a flat map of termFormId -> studentTermForm across all loaded depts
  const allTermForms = useMemo(() => {
    return deptQueries.flatMap((q) => q.data?.studentTermForms ?? []);
  }, [deptQueries]);
  const allTermFormIds = useMemo(
    () => [...new Set(allTermForms.map((termForm) => termForm.id))].sort(),
    [allTermForms],
  );
  const printStatusIdChunks = useMemo(() => {
    const chunks: string[][] = [];
    for (let index = 0; index < allTermFormIds.length; index += 500) {
      chunks.push(allTermFormIds.slice(index, index + 500));
    }
    return chunks;
  }, [allTermFormIds]);
  const printStatusQueries = useQueries({
    queries: printStatusIdChunks.map((termFormIds) =>
      _trpc.assessments.getPrintStatus.queryOptions(
        {
          termId: effectiveTermId ?? "",
          termFormIds,
        },
        {
          enabled: !!effectiveTermId,
        },
      ),
    ),
  });
  const printedAtByTermFormId = useMemo(
    () =>
      Object.assign(
        {},
        ...printStatusQueries.map((query) => query.data ?? {}),
      ) as Record<string, Date>,
    [printStatusQueries],
  );
  const isPrintStatusLoading =
    allTermFormIds.length > 0 &&
    printStatusQueries.some((query) => query.isPending || query.isFetching);

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
    printedAtByTermFormId,
    isPrintStatusLoading,
    reportsById: calculatedReport?.reportsById,
    classRooms: classRooms?.data,
    reportData,
    reportError,
    isReportLoading,
    refetchReportData,
    effectiveTermId,
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
