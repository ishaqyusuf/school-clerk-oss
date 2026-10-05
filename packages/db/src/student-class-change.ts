import { bulkChangeStudentClassSchema, type BulkChangeStudentClassInput } from "@school-clerk/utils/student-class-change-schema";
import { normalizeStudentDuplicateNameKey } from "@school-clerk/utils/student-duplicate-name";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { Prisma } from "./generated/client";
import type { Database } from "./prisma";
import { getStudentAcademicReadContext } from "./student-academic-read";

export class StudentClassChangeError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentClassChangeError";
  }
}

function conflict(message = "Enrollment ownership or academic links need review. No class placements were changed."): never {
  throw new StudentClassChangeError("CONFLICT", message);
}

export async function moveStudentTermForms(db: Database, actor: {
  schoolId: string; userId: string; bearer: string;
}, input: BulkChangeStudentClassInput) {
  const data = bulkChangeStudentClassSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const context = await getStudentAcademicReadContext(tx, actor);
      if (!context || !["ADMIN", "REGISTRAR"].includes(context.role?.toUpperCase() ?? "") ||
        !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"])) {
        throw new StudentClassChangeError("FORBIDDEN", "Class changes require student and academic management access.");
      }
      const schoolId = context.school.id;
      if (data.viewScope && (data.viewScope.schoolId !== schoolId || data.viewScope.userId !== actor.userId ||
        data.viewScope.loginSessionId !== context.loginSessionId)) {
        conflict("Your class-change workspace changed. Refresh before continuing.");
      }
      const target = await tx.classRoomDepartment.findFirst({
        where: { id: data.classroomDepartmentId, schoolProfileId: schoolId, deletedAt: null,
          classRoom: { schoolProfileId: schoolId, deletedAt: null, session: { schoolId, deletedAt: null } } },
        select: { id: true, classRoom: { select: { schoolSessionId: true } } },
      });
      if (!target?.classRoom) throw new StudentClassChangeError("NOT_FOUND", "The target class is unavailable in this school.");
      const sessionId = target.classRoom.schoolSessionId;
      const forms = await tx.studentTermForm.findMany({
        where: { id: { in: data.studentTermFormIds }, schoolProfileId: schoolId, deletedAt: null },
        select: {
          id: true, studentId: true, studentSessionFormId: true, schoolSessionId: true, sessionTermId: true,
          classroomDepartmentId: true,
          sessionTerm: { select: { schoolId: true, sessionId: true, deletedAt: true, lifecycleStatus: true } },
          sessionForm: { select: { studentId: true, schoolProfileId: true, schoolSessionId: true, deletedAt: true,
            classroomDepartmentId: true, classroomDepartment: { select: { schoolProfileId: true, deletedAt: true,
              classRoom: { select: { schoolProfileId: true, schoolSessionId: true, deletedAt: true } } } } } },
          classroomDepartment: { select: { schoolProfileId: true, deletedAt: true,
            classRoom: { select: { schoolProfileId: true, schoolSessionId: true, deletedAt: true } } } },
        },
      });
      if (forms.length !== data.studentTermFormIds.length) {
        throw new StudentClassChangeError("NOT_FOUND", "One or more selected enrollments are unavailable. No class placements were changed.");
      }
      const studentIds = new Set<string>();
      const termIds = new Set<string>();
      for (const form of forms) {
        const studentId = form.studentId ?? form.sessionForm.studentId;
        if (!studentId || form.sessionForm.studentId !== studentId || form.schoolSessionId !== sessionId ||
          form.sessionForm.schoolProfileId !== schoolId || form.sessionForm.schoolSessionId !== sessionId || form.sessionForm.deletedAt ||
          !form.sessionTermId || !form.sessionTerm || form.sessionTerm.schoolId !== schoolId ||
          form.sessionTerm.sessionId !== sessionId || form.sessionTerm.deletedAt) conflict();
        if (form.sessionTerm.lifecycleStatus === "CLOSED") conflict("An enrollment belongs to a closed term. No class placements were changed.");
        for (const placement of [
          { id: form.classroomDepartmentId, department: form.classroomDepartment },
          { id: form.sessionForm.classroomDepartmentId, department: form.sessionForm.classroomDepartment },
        ]) {
          const department = placement.department;
          if (placement.id && (!department || department.schoolProfileId !== schoolId || department.deletedAt ||
            !department.classRoom || department.classRoom.schoolProfileId !== schoolId ||
            department.classRoom.schoolSessionId !== sessionId || department.classRoom.deletedAt)) conflict();
        }
        studentIds.add(studentId);
        termIds.add(form.sessionTermId);
      }
      const orderedStudentIds = [...studentIds].sort();
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM "Students" WHERE id IN (${Prisma.join(orderedStudentIds)})
        AND "schoolProfileId" = ${schoolId} AND "deletedAt" IS NULL ORDER BY id FOR UPDATE
      `);
      if (locked.length !== orderedStudentIds.length) conflict("One or more student identities are unavailable. Refresh the directory.");
      if (!await getStudentAcademicReadContext(tx, actor)) {
        throw new StudentClassChangeError("FORBIDDEN", "Your session expired while waiting. Sign in before changing classes.");
      }
      const students = await tx.students.findMany({
        where: { id: { in: orderedStudentIds }, schoolProfileId: schoolId, deletedAt: null },
        select: { id: true, name: true, surname: true, otherName: true },
      });
      if (students.length !== orderedStudentIds.length) conflict();
      const studentsById = new Map(students.map((student) => [student.id, student]));
      const parentIds = [...new Set(forms.map((form) => form.studentSessionFormId))];
      const parents = await tx.studentSessionForm.findMany({
        where: { studentId: { in: orderedStudentIds }, schoolSessionId: sessionId, deletedAt: null },
        select: { id: true, studentId: true, schoolProfileId: true },
      });
      for (const studentId of orderedStudentIds) {
        const matches = parents.filter((parent) => parent.studentId === studentId);
        const parent = matches[0];
        if (matches.length !== 1 || !parent || parent.schoolProfileId !== schoolId || !parentIds.includes(parent.id)) conflict();
      }
      const references = await tx.studentTermForm.findMany({
        where: { OR: [{ studentId: { in: orderedStudentIds } }, { studentSessionFormId: { in: parentIds } },
          { sessionForm: { studentId: { in: orderedStudentIds } } }], deletedAt: {} },
        select: { id: true, studentId: true, studentSessionFormId: true, schoolProfileId: true,
          schoolSessionId: true, sessionTermId: true, deletedAt: true, sessionForm: { select: { studentId: true } } },
      });
      const parentStudent = new Map(forms.map((form) => [form.studentSessionFormId, form.sessionForm.studentId]));
      for (const reference of references) {
        const parentOwner = parentStudent.get(reference.studentSessionFormId);
        // Parent defaults are shared with historical terms, so inspect archived links too.
        if (parentOwner && (reference.schoolProfileId !== schoolId || reference.schoolSessionId !== sessionId ||
          (reference.studentId !== null && reference.studentId !== parentOwner))) conflict();
      }
      for (const form of forms) {
        const studentId = form.studentId ?? form.sessionForm.studentId;
        const matches = references.filter((reference) => !reference.deletedAt && reference.sessionTermId === form.sessionTermId &&
          (reference.studentId ?? reference.sessionForm.studentId) === studentId);
        if (matches.length !== 1 || matches[0]?.id !== form.id) conflict("Duplicate enrollment needs review before changing class.");
      }
      const occupants = await tx.studentTermForm.findMany({
        where: { schoolProfileId: schoolId, classroomDepartmentId: target.id,
          sessionTermId: { in: [...termIds] }, deletedAt: null },
        select: { sessionTermId: true, studentId: true, schoolSessionId: true,
          sessionForm: { select: { studentId: true, schoolProfileId: true, schoolSessionId: true, deletedAt: true } } },
      });
      const occupantIds = new Set<string>();
      for (const occupant of occupants) {
        const studentId = occupant.studentId ?? occupant.sessionForm.studentId;
        if (!studentId || occupant.sessionForm.studentId !== studentId || occupant.schoolSessionId !== sessionId ||
          occupant.sessionForm.schoolProfileId !== schoolId || occupant.sessionForm.schoolSessionId !== sessionId ||
          occupant.sessionForm.deletedAt) conflict("Destination enrollment records need integrity review before this move.");
        occupantIds.add(studentId);
      }
      const occupantStudents = await tx.students.findMany({
        where: { id: { in: [...occupantIds] }, schoolProfileId: schoolId, deletedAt: null },
        select: { id: true, name: true, surname: true, otherName: true },
      });
      if (occupantStudents.length !== occupantIds.size) conflict("Destination student identities need integrity review.");
      const occupantsById = new Map(occupantStudents.map((student) => [student.id, student]));
      const destinations = new Map<string, Set<string>>();
      for (const occupant of occupants) {
        const student = occupantsById.get((occupant.studentId ?? occupant.sessionForm.studentId)!);
        if (!student) conflict();
        const name = normalizeStudentDuplicateNameKey(student);
        if (name) {
          const key = JSON.stringify([occupant.sessionTermId, name]);
          const identities = destinations.get(key) ?? new Set<string>();
          identities.add(student.id);
          destinations.set(key, identities);
        }
      }
      for (const form of forms) {
        const student = studentsById.get((form.studentId ?? form.sessionForm.studentId)!);
        if (!student) conflict();
        const name = normalizeStudentDuplicateNameKey(student);
        if (!name) continue;
        const key = JSON.stringify([form.sessionTermId, name]);
        const existing = destinations.get(key);
        if (existing && [...existing].some((id) => id !== student.id)) conflict("A student with this exact name already exists in the destination class and term. Review or merge duplicate identities first.");
        destinations.set(key, new Set([student.id]));
      }
      const changed = forms.filter((form) => form.classroomDepartmentId !== target.id);
      const changedParents = [...new Set(changed.map((form) => form.studentSessionFormId))];
      if (changed.length) {
        const moved = await tx.studentTermForm.updateMany({
          where: { id: { in: changed.map((form) => form.id) }, schoolProfileId: schoolId, deletedAt: null },
          data: { classroomDepartmentId: target.id },
        });
        const updatedParents = await tx.studentSessionForm.updateMany({
          where: { id: { in: changedParents }, schoolProfileId: schoolId, schoolSessionId: sessionId,
            studentId: { in: orderedStudentIds }, deletedAt: null },
          data: { classroomDepartmentId: target.id },
        });
        if (moved.count !== changed.length || updatedParents.count !== changedParents.length) conflict("Enrollment changed during the move. Refresh before trying again.");
      }
      return { count: changed.length, alreadyInClass: forms.length - changed.length,
        studentIds: orderedStudentIds, termFormIds: forms.map((form) => form.id),
        sessionFormCount: changedParents.length, classroomDepartmentId: target.id };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      conflict("Enrollment changed concurrently. Refresh before trying again.");
    }
    throw error;
  }
}
