import { getResultComment } from "@api/db/queries/first-term-data";
import { classroomDisplayName, sum } from "@school-clerk/utils";

const assessmentOrder = ["الحضور", "الاختبار", "الامتحان"];

type AssessmentResult = {
  obtained: number | null;
  percentageScore?: number | null;
  studentTermFormId: string | null;
};

type Assessment = {
  title: string;
  percentageObtainable: number | null;
  obtainable: number;
  index?: number | null;
  assessmentResults: AssessmentResult[];
};

type SubjectSheet = {
  subject: {
    title: string;
  };
  assessments: Assessment[];
};

type StudentTermForm = {
  id: string;
  classroomDepartmentId?: string | null;
  student: {
    id?: string | null;
    gender?: string | null;
    name?: string | null;
    otherName?: string | null;
    surname?: string | null;
  };
};

type DepartmentSheet = {
  departmentName?: string | null;
  subjects: SubjectSheet[];
  studentTermForms: StudentTermForm[];
};

type ClassroomOption = {
  id: string;
  departmentName?: string | null;
  classRoom?: {
    name?: string | null;
  } | null;
};

type ReportTable = {
  columns: {
    label?: string;
    subLabel?: string;
  }[];
  rows: {
    columns: {
      value?: string | number | null;
    }[];
  }[];
};

export type StudentReportRecord = {
  termFormId: string;
  departmentId?: string | null;
  departmentName: string;
  tables: ReportTable[];
  lineCount: number;
  grade: {
    obtained: number;
    obtainable: number;
    totalStudents: number;
    position: number;
    percentage: number;
  };
  student: StudentTermForm["student"];
  comment: ReturnType<typeof getResultComment>;
  summary: {
    subjects: number;
    results: number;
  };
};

function tableModel() {
  const tables: Record<string, ReportTable> = {};
  return tables;
}

export function buildStudentReportsById({
  departmentSheets,
  classrooms,
}: {
  departmentSheets: DepartmentSheet[];
  classrooms?: ClassroomOption[];
}) {
  const allStudents = departmentSheets.flatMap((data) => {
    if (!data) return [];

    const totalStudents = data.studentTermForms.length;

    return (
      data.studentTermForms?.map((tf) => {
        const subjectList = data.subjects?.map((subject) => {
          const assessments = subject.assessments.map((_as) => {
            const record = _as.assessmentResults.find(
              (r) => r.studentTermFormId === tf.id,
            );
            const obtained =
              record?.percentageScore || record?.obtained
                ? _as?.percentageObtainable === _as?.obtainable
                  ? record?.obtained
                  : _as.percentageObtainable
                    ? sum([
                        ((record?.obtained ?? 0) / _as.obtainable) *
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
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

          const assessmentCode = assessments.map((a) => a.label).join("-");

          if (!tables[assessmentCode]) {
            tables[assessmentCode] = {
              columns: [
                {
                  label: "المواد",
                },
                ...assessments.map((a) => ({
                  label: a.label,
                  subLabel: `(${a.obtainable ?? "-"})`,
                })),
                {
                  label: "المجموع الكلي",
                  subLabel: "(100)",
                },
              ],
              rows: [],
            };
          }

          tables[assessmentCode].rows.push({
            columns: [
              {
                value: `${si + 1}. ${subject.title}`,
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

        const rowsCount = sum(Object.values(tables).map((a) => 1 + a.rows.length));
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
          grade.obtainable ? (grade.obtained / grade.obtainable) * 100 : 0,
        ]).toFixed(1);

        return {
          termFormId: tf.id,
          departmentId: tf.classroomDepartmentId,
          departmentName: classroomDisplayName({
            className: classrooms?.find((room) => room.id === tf.classroomDepartmentId)
              ?.classRoom?.name,
            departmentName: data.departmentName,
          }),
          tables: Object.values(tables),
          lineCount: rowsCount,
          grade,
          student: tf.student,
          comment: getResultComment(grade.percentage),
          summary: {
            subjects: subjectList.length,
            results: subjectList.filter((a) =>
              a.assessments.some((b) => b.obtained),
            ).length,
          },
        } satisfies StudentReportRecord;
      }) || []
    );
  });

  const byDept: Record<string, typeof allStudents> = {};
  allStudents.forEach((student) => {
    const deptKey = student.departmentId ?? "unknown";
    if (!byDept[deptKey]) byDept[deptKey] = [];
    byDept[deptKey].push(student);
  });

  Object.values(byDept).forEach((deptStudents) => {
    deptStudents.forEach((student) => {
      student.grade.position =
        deptStudents.filter((a) => a.grade.obtained > student.grade.obtained)
          .length + 1;
    });
  });

  return Object.fromEntries(
    allStudents.map((student) => [student.termFormId, student]),
  ) as Record<string, StudentReportRecord>;
}
