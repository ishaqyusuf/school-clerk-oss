import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";
import { classroomDisplayName } from "@school-clerk/utils";
import { StudentClassChangeError } from "./student-class-change";

export async function getStudentClassChangeOptions(db: DatabaseTransaction, input: {
  schoolId: string; studentTermFormIds: string[];
}) {
  const { schoolId } = input;
  const forms = await db.studentTermForm.findMany({
    where: { id: { in: input.studentTermFormIds }, schoolProfileId: schoolId, deletedAt: null },
    select: {
      id: true, studentId: true, schoolSessionId: true,
      schoolSession: { select: { schoolId: true, deletedAt: true } },
      sessionTerm: { select: { schoolId: true, sessionId: true, deletedAt: true, lifecycleStatus: true } },
      sessionForm: { select: { schoolProfileId: true, schoolSessionId: true, studentId: true, deletedAt: true } },
    },
  });
  if (forms.length !== input.studentTermFormIds.length) {
    throw new StudentClassChangeError("NOT_FOUND", "One or more selected enrollments are unavailable. Refresh and reselect the records.");
  }
  const sessionIds = new Set<string>();
  const studentIds = new Set<string>();
  for (const form of forms) {
    const studentId = form.studentId ?? form.sessionForm.studentId;
    if (!studentId || form.sessionForm.studentId !== studentId || form.sessionForm.schoolProfileId !== schoolId ||
      form.sessionForm.deletedAt || !form.schoolSessionId || form.sessionForm.schoolSessionId !== form.schoolSessionId ||
      !form.schoolSession || form.schoolSession.schoolId !== schoolId || form.schoolSession.deletedAt ||
      !form.sessionTerm || form.sessionTerm.schoolId !== schoolId || form.sessionTerm.sessionId !== form.schoolSessionId || form.sessionTerm.deletedAt) {
      throw new StudentClassChangeError("CONFLICT", "Selected enrollment links need review before choosing a destination.");
    }
    if (form.sessionTerm.lifecycleStatus === "CLOSED") {
      throw new StudentClassChangeError("CONFLICT", "An enrollment belongs to a closed term. Class changes are unavailable.");
    }
    sessionIds.add(form.schoolSessionId);
    studentIds.add(studentId);
  }
  const sessionId = [...sessionIds][0];
  if (sessionIds.size !== 1 || !sessionId) {
    throw new StudentClassChangeError("CONFLICT", "Select enrollments from one academic session for this class change.");
  }
  const students = await db.students.count({
    where: { id: { in: [...studentIds] }, schoolProfileId: schoolId, deletedAt: null },
  });
  if (students !== studentIds.size) throw new StudentClassChangeError("CONFLICT", "Selected student identities are unavailable.");
  const classrooms = await db.classRoomDepartment.findMany({
    where: { schoolProfileId: schoolId, deletedAt: null,
      classRoom: { schoolProfileId: schoolId, schoolSessionId: sessionId, deletedAt: null } },
    select: { id: true, departmentName: true, classRoom: { select: { name: true } } },
    orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }, { id: "asc" }],
  });
  return { sessionId, studentTermFormIds: [...input.studentTermFormIds].sort(),
    classrooms: classrooms.map((classroom) => ({ id: classroom.id,
      displayName: classroomDisplayName({ className: classroom.classRoom?.name, departmentName: classroom.departmentName }) || "Unnamed class" })) };
}
