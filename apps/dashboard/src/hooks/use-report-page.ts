import { createContext, useContext, useMemo } from "react";
import { useStudentReportFilterParams } from "./use-student-report-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useDebugConsole } from "./use-debug-console";
import { enToAr, percent, sum } from "@school-clerk/utils";
import { getResultComment } from "@api/db/queries/first-term-data";

type ReportPageContext = ReturnType<typeof createReportPageContext>;
export const ReportPageContext = createContext<ReportPageContext>(undefined);
export const ReportPageProvider = ReportPageContext.Provider;
export const createReportPageContext = () => {
  const { filters } = useStudentReportFilterParams();
  const {
    data: reportData,
    error,
    isPending,
  } = useQuery(
    _trpc.assessments.getClassroomReportSheet.queryOptions(
      {
        departmentId: filters.departmentId,
        sessionTermId: filters.termId,
      },
      {
        enabled: !!filters.departmentId,
      }
    )
  );
  const { data: classRooms } = useQuery(
    _trpc.classrooms.all.queryOptions({
      sessionTermId: filters.termId,
    })
  );
  const calculatedReport = useMemo(() => {
    const totalStudents = reportData?.studentTermForms.length;
    const students =
      reportData?.studentTermForms?.map((tf) => {
        const subjectList = reportData?.subjects?.map((subject) => {
          const assessments = subject.assessments.map((_as) => {
            const record = _as.assessmentResults.find(
              (r) => r.studentTermFormId == tf.id
            );
            return {
              obtainable: _as.obtainable,
              obtained:
                record?.percentageScore || record?.obtained
                  ? sum([
                      (record?.obtained / _as.obtainable) *
                        _as.percentageObtainable,
                    ])
                  : null,
              index: _as.index,
              label: _as.title,
            };
          });
          return {
            title: subject.subject.title,
            assessments,
            // index: subject.index
          };
        });
        const tables = tableModel();
        const response = subjectList.map((subject, si) => {
          const assessmentCode = subject.assessments
            .map((a) => a.label)
            .join("-");
          if (!tables[assessmentCode])
            tables[assessmentCode] = {
              columns: [
                {
                  label: `المواد`,
                },
                ...subject.assessments
                  // ?.filter((a) => a.assessmentType == "primary")
                  .map((a) => ({
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
              ...subject.assessments
                //  .filter((a) => a.assessmentType == "primary")
                .map((a) => ({
                  value: a.obtained,
                })),
              {
                value: sum(
                  subject.assessments
                    //  .filter((a) => a.assessmentType == "primary")
                    .map((a) => a.obtained)
                ),
              },
            ],
          });
        });
        const rowsCount = sum(
          Object.values(tables).map((a) => 1 + a.rows.length)
        );
        const grade = {
          obtained: sum(
            subjectList.map((a) => a.assessments.map((b) => b.obtained).flat())
          ),
          obtainable: sum(
            subjectList.map((a) =>
              a.assessments.map((b) => b.obtainable).flat()
            )
          ),
          totalStudents,
          position: 0,
          percentage: 0,
        };
        grade.percentage = sum([(grade.obtained / grade.obtainable) * 100]);
        return {
          termFormId: tf.id,
          tables: Object.values(tables),
          lineCount: rowsCount,
          grade,
          subjectList,
          student: tf.student,
          comment: getResultComment(grade.percentage),
          //   classroom: { title: tf..classTitle },
        };
        // .flat();
      }) || [];

    return {
      reportsById: Object.fromEntries(
        students?.map((student) => {
          student.grade.position =
            students.filter((a) => a.grade.obtained > student.grade.obtained)
              ?.length + 1;
          return [student.termFormId, student];
        })
      ),
    };
  }, [reportData]);
  return {
    classroomName: reportData?.departmentName,
    termForms: reportData?.studentTermForms,
    reportsById: calculatedReport?.reportsById,
    classRooms: classRooms?.data,
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
          // style?: '
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
      "useReportPageContext must be used within a ReportPageProvider"
    );
  }
  return context;
};
