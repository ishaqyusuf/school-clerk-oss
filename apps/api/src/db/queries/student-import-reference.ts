import type { TRPCContext } from "@api/trpc/init";
import { readStudentImportReference, StudentImportAccessError } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";
import { studentImportSessionAuthority } from "./student-import-access";

export async function readStudentImportReferenceContext(ctx: TRPCContext) {
  const { schoolId, sessionId, termId } = ctx.profile;
  if (!schoolId || !sessionId || !termId) throw new TRPCError({ code: "UNAUTHORIZED", message: "An active school, session and term are required to review an import." });
  try {
    return await readStudentImportReference(ctx.db, studentImportSessionAuthority(ctx), { schoolId, sessionId, termId });
  } catch (error) {
    if (error instanceof StudentImportAccessError) throw new TRPCError({ code: error.code, message: error.message });
    throw error;
  }
}

export async function getImportNameGuide(ctx: TRPCContext) {
  const reference = await readStudentImportReferenceContext(ctx);
  return { names: reference.names };
}

export async function getStudentImportReference(ctx: TRPCContext) {
  const reference = await readStudentImportReferenceContext(ctx);
  return { ...reference, students: reference.students.map(({ termForms, ...student }) => {
    const form = termForms.find((form) => form.sessionTermId === reference.sessionTermId) ?? termForms[0];
    return { ...student,
      termId: form?.sessionTermId ?? null,
      schoolSessionId: form?.schoolSessionId ?? null,
      classroomDepartmentId: form?.classroomDepartmentId ?? null,
      classRoom: form?.classroomDepartment?.departmentName ?? null,
      termSheetId: form?.id ?? null,
      termName: form?.sessionTerm?.title ?? null,
      sessionName: form?.schoolSession?.title ?? null,
      studentSessionFormId: form?.schoolSessionId === reference.schoolSessionId ? form.studentSessionFormId : null,
    };
  }) };
}
