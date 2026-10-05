import type { Database } from "./prisma";
import { classroomDepartmentListOrderBy } from "./classroom-order";
import { requireStudentImportAccess, requireStudentImportAcademicScope, StudentImportAccessError,
  type StudentImportAuthority } from "./student-import-access";

export async function readStudentImportReference(db: Database, authority: StudentImportAuthority,
  scope: { schoolId: string; sessionId: string; termId: string }) {
  if (authority.kind !== "session") throw new StudentImportAccessError("FORBIDDEN", "A live session is required to review an import.");
  const result = await db.$transaction(async (tx) => {
    const access = await requireStudentImportAccess(tx, authority);
    if (scope.schoolId !== access.schoolId) throw new StudentImportAccessError("FORBIDDEN", "Import workspace changed. Reopen the import.");
    await requireStudentImportAcademicScope(tx, scope);
    const classDepartments = await tx.classRoomDepartment.findMany({
      where: { schoolProfileId: scope.schoolId, deletedAt: null,
        classRoom: { schoolProfileId: scope.schoolId, schoolSessionId: scope.sessionId, deletedAt: null } },
      select: { id: true, departmentName: true, classRoom: { select: { id: true, name: true } } },
      orderBy: classroomDepartmentListOrderBy,
    });
    const students = await tx.students.findMany({
      where: { schoolProfileId: scope.schoolId, deletedAt: null },
      select: { id: true, name: true, surname: true, otherName: true, gender: true },
      orderBy: { id: "asc" },
    });
    const ids = students.map((student) => student.id);
    const studentIds = new Set(ids);
    const references = await tx.studentTermForm.findMany({
      where: { deletedAt: null, OR: [{ studentId: { in: ids } }, { sessionForm: { studentId: { in: ids } } }] },
      select: { id: true, studentId: true, sessionTermId: true, sessionForm: { select: { studentId: true } } },
    });
    const forms = await tx.studentTermForm.findMany({
      where: { id: { in: references.map((reference) => reference.id) }, schoolProfileId: scope.schoolId, deletedAt: null,
        schoolSession: { schoolId: scope.schoolId, deletedAt: null },
        sessionTerm: { schoolId: scope.schoolId, deletedAt: null },
        sessionForm: { schoolProfileId: scope.schoolId, deletedAt: null },
        classroomDepartment: { schoolProfileId: scope.schoolId, deletedAt: null,
          classRoom: { schoolProfileId: scope.schoolId, deletedAt: null } } },
      select: { id: true, studentId: true, studentSessionFormId: true, schoolSessionId: true, sessionTermId: true,
        classroomDepartmentId: true,
        sessionForm: { select: { studentId: true, schoolSessionId: true } },
        sessionTerm: { select: { id: true, title: true, sessionId: true } },
        schoolSession: { select: { id: true, title: true } },
        classroomDepartment: { select: { id: true, departmentName: true,
          classRoom: { select: { name: true, schoolSessionId: true } } } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    const validForms = forms.filter((form) => {
      const studentId = form.studentId ?? form.sessionForm.studentId;
      return !!studentId && studentId === form.sessionForm.studentId && studentIds.has(studentId) &&
        !!form.schoolSessionId && form.schoolSessionId === form.sessionForm.schoolSessionId &&
        form.schoolSessionId === form.sessionTerm?.sessionId &&
        form.schoolSessionId === form.classroomDepartment?.classRoom?.schoolSessionId;
    });
    const referencesByStudent = new Map<string, typeof references>();
    for (const reference of references) {
      for (const id of new Set([reference.studentId, reference.sessionForm.studentId])) {
        if (id && studentIds.has(id)) {
          const items = referencesByStudent.get(id) ?? [];
          items.push(reference);
          referencesByStudent.set(id, items);
        }
      }
    }
    const formsByStudent = new Map<string, typeof validForms>();
    for (const form of validForms) {
      const id = form.studentId ?? form.sessionForm.studentId;
      if (!id) continue;
      const items = formsByStudent.get(id) ?? [];
      items.push(form);
      formsByStudent.set(id, items);
    }
    const candidates = students.map((student) => {
      const studentReferences = referencesByStudent.get(student.id) ?? [];
      const termForms = formsByStudent.get(student.id) ?? [];
      const termIds = studentReferences.map((reference) => reference.sessionTermId);
      const historyNeedsReview = studentReferences.length !== termForms.length ||
        termIds.some((id) => !id) || new Set(termIds).size !== termIds.length;
      return { ...student, termForms: historyNeedsReview ? [] : termForms.map((form) => ({
        id: form.id, studentSessionFormId: form.studentSessionFormId, sessionTermId: form.sessionTermId,
        schoolSessionId: form.schoolSessionId, classroomDepartmentId: form.classroomDepartmentId,
        sessionTerm: form.sessionTerm, schoolSession: form.schoolSession, classroomDepartment: form.classroomDepartment,
      })), historyNeedsReview };
    });
    const names = [...new Set(students.flatMap((student) => [student.name, student.surname, student.otherName])
      .map((name) => name?.replace(/\s+/g, " ").trim()).filter((name): name is string => !!name))];
    return { scope: { ...scope, userId: access.userId, loginSessionId: access.loginSessionId },
      classDepartments, students: candidates, names, sessionTermId: scope.termId, schoolSessionId: scope.sessionId };
  }, { isolationLevel: "RepeatableRead" });
  // Recheck live access after the snapshot; subsequent revocation applies on the next request.
  await requireStudentImportAccess(db, authority);
  return result;
}
