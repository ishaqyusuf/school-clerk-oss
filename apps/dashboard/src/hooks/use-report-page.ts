import { createContext, useContext, useMemo } from "react";
import { useStudentReportFilterParams } from "./use-student-report-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQuery, useQueries } from "@tanstack/react-query";
import { classroomDisplayName, enToAr, sum } from "@school-clerk/utils";
import { getResultComment } from "@api/db/queries/first-term-data";
import { subjectsArray } from "@/app/dashboard/[domain]/migration/constants";

const assessmentOrder = ["الحضور", "الاختبار", "الامتحان"];
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
    // Process each department's data
    const allStudents = deptQueries.flatMap((q) => {
      const data = q.data;
      if (!data) return [];
      const totalStudents = data.studentTermForms.length;
      return (
        data.studentTermForms?.map((tf) => {
          const subjectList = data.subjects?.map((subject) => {
            const assessments = subject.assessments.map((_as) => {
              const record = _as.assessmentResults.find(
                (r) => r.studentTermFormId == tf.id,
              );
              const obtained =
                record?.percentageScore || record?.obtained
                  ? _as?.percentageObtainable === _as?.obtainable
                    ? record?.obtained
                    : _as.percentageObtainable
                      ? sum([
                          (record?.obtained / _as.obtainable) *
                            _as.percentageObtainable,
                        ])
                      : null
                  : null;

              return {
                obtainable: _as.percentageObtainable,
                obtained,
                index: _as.index,
                label: _as.title,
              };
            });
            return {
              title: subject.subject.title,
              assessments,
            };
          });
          const tables = tableModel();
          subjectList.map((subject, si) => {
            const assessments = subject.assessments
              .map((a) => {
                a.index = assessmentOrder.findIndex((b) => b === a.label);
                return a;
              })
              .sort((a, b) => a.index - b.index);
            const assessmentCode = assessments.map((a) => a.label).join("-");
            if (!tables[assessmentCode])
              tables[assessmentCode] = {
                columns: [
                  {
                    label: `المواد`,
                  },
                  ...assessments.map((a) => ({
                    label: a.label,
                    subLabel: `(${a.obtainable ? enToAr(a.obtainable) : "-"})`,
                  })),
                  {
                    label: `المجموع الكلي`,
                    subLabel: `(${enToAr(100)})`,
                  },
                ],
                rows: [],
              };
            tables[assessmentCode].rows.push({
              columns: [
                {
                  value: `${enToAr(si + 1)}. ${subject.title}`,
                },
                ...assessments.map((a) => ({
                  value: a.obtained,
                })),
                {
                  value: sum(assessments.map((a) => a.obtained)),
                },
              ],
            });
          });
          const rowsCount = sum(
            Object.values(tables).map((a) => 1 + a.rows.length),
          );
          const grade = {
            obtained: sum(
              subjectList.map((a) => a.assessments.map((b) => b.obtained)).flat(),
            ),
            obtainable: sum(
              subjectList
                .map((a) => a.assessments.map((b) => b.obtainable))
                .flat(),
            ),
            totalStudents,
            position: 0,
            percentage: 0,
          };
          grade.percentage = +sum([
            (grade.obtained / grade.obtainable) * 100,
          ]).toFixed(1);
          const comment = getResultComment(grade.percentage);

          return {
            termFormId: tf.id,
            departmentId: tf.classroomDepartmentId,
            departmentName: classroomDisplayName({
              className: classRooms?.data?.find(
                (room) => room.id === tf.classroomDepartmentId,
              )?.classRoom?.name,
              departmentName: data.departmentName,
            }),
            tables: Object.values(tables),
            lineCount: rowsCount,
            grade,
            subjectList,
            student: tf.student,
            comment,
            summary: {
              subjects: subjectList.length,
              results: subjectList.filter((a) =>
                a.assessments.some((b) => b.obtained),
              ).length,
            },
          };
        }) || []
      );
    });

    // Compute positions within each department separately
    const byDept: Record<string, typeof allStudents> = {};
    allStudents.forEach((s) => {
      if (!byDept[s.departmentId ?? "unknown"]) {
        byDept[s.departmentId ?? "unknown"] = [];
      }
      byDept[s.departmentId ?? "unknown"].push(s);
    });
    Object.values(byDept).forEach((deptStudents) => {
      deptStudents.forEach((student) => {
        student.grade.position =
          deptStudents.filter((a) => a.grade.obtained > student.grade.obtained)
            ?.length + 1;
      });
    });

    return {
      reportsById: Object.fromEntries(
        allStudents.map((student) => [student.termFormId, student]),
      ),
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
function tableModel() {
  const tables: {
    [tk in string]: {
      columns: {
        label?: string;
        subLabel?: string;
      }[];
      rows: {
        columns: {
          value?;
        }[];
      }[];
    };
  } = {};
  return tables;
}
export const useReportPageContext = () => {
  const context = useContext(ReportPageContext);
  if (context === undefined) {
    throw new Error(
      "useReportPageContext must be used within a ReportPageProvider",
    );
  }
  return context;
};
