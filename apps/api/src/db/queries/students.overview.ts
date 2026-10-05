import type { TRPCContext } from "@api/trpc/init";
import type { GetStudentOverviewSchema } from "@api/trpc/schemas/schemas";
import { readStudentAcademicOverview } from "./student-academic-read";

export async function studentsOverview(ctx: TRPCContext, query: GetStudentOverviewSchema) {
  const { id, student, studentTerms, scope, capabilities } = await readStudentAcademicOverview(ctx, query);
  return { id, student, studentTerms, scope, capabilities };
}

export async function studentAcademicsOverview(ctx: TRPCContext, query: GetStudentOverviewSchema) {
  const result = await readStudentAcademicOverview(ctx, query);
  const { student, studentTerms: termHistory } = result;
  const selected = termHistory.find((term) => term.studentTermId === result.id);
  return {
    id: null,
    termHistory,
    term: termHistory.find((term) => term.termId === query.termId),
    student: {
      id: student.id, gender: student.gender, dob: student.dob, createdAt: student.createdAt,
      studentName: student.studentName,
      department: Array.from(new Set([selected?.className, selected?.departmentName].filter(Boolean))).join(" "),
      departmentId: selected?.departmentId ?? undefined,
      classId: selected?.classroomId ?? undefined,
      termFormId: selected?.studentTermId ?? undefined,
      termFormSessionTermId: selected?.termId ?? undefined,
      admissionType: result.selectedAdmissionType,
      status: selected?.studentTermId ? "enrolled" : termHistory.some((term) => term.enrollmentState === "unavailable")
        ? "unavailable" : "not enrolled",
      guardianName: student.guardian?.name ?? null,
      guardianPhone: student.guardian?.phone ?? null,
    },
  };
}
