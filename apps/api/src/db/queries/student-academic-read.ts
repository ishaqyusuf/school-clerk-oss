import type { TRPCContext } from "@api/trpc/init";
import { getStudentOverviewSchema, type GetStudentOverviewSchema } from "@api/trpc/schemas/schemas";
import { getStudentAcademicReadContext, getStudentAcademicRecords } from "@school-clerk/db";
import { classroomDisplayName, formatStudentName, normalizeStudentNameFormat } from "@school-clerk/utils";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";

type AcademicRecords = NonNullable<Awaited<ReturnType<typeof getStudentAcademicRecords>>>;

function mapStudentTerms(records: AcademicRecords) {
  const rows = records.terms.map((term) => {
    const matches = records.forms.filter((form) => form.sessionTermId === term.id);
    const referenceCount = records.referenceCounts.get(term.id) ?? 0;
    const enrollmentState: "enrolled" | "not-enrolled" | "unavailable" = referenceCount === 1 && matches.length === 1
      ? "enrolled" : referenceCount > 0 || records.hasUnmappedHistory ? "unavailable" : "not-enrolled";
    const form = enrollmentState === "enrolled" ? matches[0] : undefined;
    const department = form?.classroomDepartment;
    const className = department?.classRoom?.name ?? null;
    const departmentName = department?.departmentName ?? null;
    return {
      term: `${term.title} ${term.session?.title ?? ""}`.trim(),
      termId: term.id, termSessionId: term.sessionId,
      enrollmentState,
      studentTermId: form?.id ?? null,
      departmentName, className,
      classDisplayName: classroomDisplayName({ className, departmentName }) || null,
      departmentId: department?.id ?? null, classroomId: department?.classRoomsId ?? null,
      studentSessionId: form?.sessionForm.id ?? null,
    };
  });
  return rows.map((row) => {
    // Never invent a term-form link. Only reuse a unique same-session placement.
    if (row.enrollmentState !== "not-enrolled") return row;
    const candidates = records.forms.filter((form) => form.schoolSessionId === row.termSessionId);
    const placements = new Set(candidates.map((candidate) => JSON.stringify([
      candidate.sessionForm.id, candidate.classroomDepartment?.id, candidate.classroomDepartment?.classRoomsId,
    ])));
    const fallback = placements.size === 1 ? candidates[0] : undefined;
    const department = fallback?.classroomDepartment;
    if (!fallback || !department?.classRoom) return row;
    return { ...row, studentSessionId: fallback.sessionForm.id,
      departmentId: department.id, classroomId: department.classRoomsId,
      departmentName: department.departmentName, className: department.classRoom.name,
      classDisplayName: classroomDisplayName({ className: department.classRoom.name,
        departmentName: department.departmentName }) || null };
  });
}

export async function readStudentAcademicOverview(ctx: TRPCContext, input: GetStudentOverviewSchema) {
  const query = getStudentOverviewSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  }
  return ctx.db.$transaction(async (tx) => {
    const context = await getStudentAcademicReadContext(tx, { schoolId, userId, bearer });
    if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
      !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"])) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Student academic records require student and academic management access." });
    }
    if (query.viewScope && (query.viewScope.schoolId !== schoolId || query.viewScope.userId !== userId ||
      query.viewScope.loginSessionId !== context.loginSessionId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Student overview workspace changed. Reload the page." });
    }
    const records = await getStudentAcademicRecords(tx, { schoolId, studentId: query.studentId });
    if (!records) throw new TRPCError({ code: "NOT_FOUND", message: "Student was not found in this school." });
    const studentTerms = mapStudentTerms(records);
    const selected = query.termSheetId ? studentTerms.find((term) => term.studentTermId === query.termSheetId)
      : query.termId ? studentTerms.find((term) => term.termId === query.termId)
        : studentTerms.find((term) => term.studentTermId);
    if ((query.termSheetId && !selected) || (query.termId && (!selected || selected.termId !== query.termId))) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Student academic selection was not found." });
    }
    const { guardians, ...student } = records.student;
    return {
      scope: { schoolId, userId, loginSessionId: context.loginSessionId },
      capabilities: { enroll: canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["BILLING_FINANCE"]) },
      id: selected?.studentTermId ?? undefined,
      student: { ...student, guardian: guardians[0]?.guardian ?? null,
        studentName: formatStudentName(student, normalizeStudentNameFormat(context.school.studentNameFormat)) },
      studentTerms,
      selectedAdmissionType: records.forms.find((form) => form.id === selected?.studentTermId)?.admissionType ?? "UNCLASSIFIED",
    };
  }, { isolationLevel: "RepeatableRead" });
}
