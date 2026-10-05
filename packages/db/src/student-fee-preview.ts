import type { Prisma } from "./generated/client";
import { applicableStudentAudiences, applicableStudentGenderAudiences, type AdmissionType, type StudentGender } from "./student-fee-application";

export class StudentFeePreviewError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentFeePreviewError";
  }
}

export async function getStudentFeePreview(db: Prisma.TransactionClient, input: {
  schoolId: string; sessionTermId: string; classroomDepartmentId?: string | null;
  admissionType: AdmissionType; studentGender: StudentGender;
}) {
  const term = await db.sessionTerm.findFirst({
    where: { id: input.sessionTermId, schoolId: input.schoolId, deletedAt: null,
      session: { schoolId: input.schoolId, deletedAt: null } },
    select: { sessionId: true, lifecycleStatus: true },
  });
  if (!term) throw new StudentFeePreviewError("NOT_FOUND", "Academic term was not found in this school.");
  if (term.lifecycleStatus === "CLOSED") throw new StudentFeePreviewError("CONFLICT", "Enrollment fee preview is unavailable for a closed term.");
  if (input.classroomDepartmentId) {
    const classroom = await db.classRoomDepartment.findFirst({
      where: { id: input.classroomDepartmentId, schoolProfileId: input.schoolId, deletedAt: null,
        classRoom: { schoolProfileId: input.schoolId, schoolSessionId: term.sessionId, deletedAt: null } },
      select: { id: true },
    });
    if (!classroom) throw new StudentFeePreviewError("NOT_FOUND", "Classroom was not found in this academic session.");
  }
  const items = await db.financeItem.findMany({
    where: {
      schoolProfileId: input.schoolId, deletedAt: null, isActive: true,
      stream: { schoolProfileId: input.schoolId, deletedAt: null },
      studentAudience: { in: applicableStudentAudiences(input.admissionType) },
      studentGenderAudience: { in: applicableStudentGenderAudiences(input.studentGender) },
      AND: [
        { OR: [{ schoolSessionId: term.sessionId }, { schoolSessionId: null }] },
        { OR: [{ sessionTermId: input.sessionTermId }, { sessionTermId: null }] },
        { OR: [{ applicableClasses: { none: { deletedAt: null } } },
          ...(input.classroomDepartmentId ? [{ applicableClasses: { some: {
            deletedAt: null, classRoomDepartmentId: input.classroomDepartmentId,
          } } }] : [])] },
      ],
    },
    select: { id: true, name: true, amount: true, description: true, collectable: true,
      studentAudience: true, studentGenderAudience: true, stream: { select: { name: true } } },
    orderBy: [{ collectable: "desc" }, { name: "asc" }, { id: "asc" }],
  });
  return items.map((item) => ({
    feeHistoryId: item.id, title: item.name, amount: Number(item.amount), description: item.description,
    scope: input.classroomDepartmentId ? "Classroom or school" : "School",
    streamName: item.stream.name, collectable: item.collectable,
    studentAudience: item.studentAudience, studentGenderAudience: item.studentGenderAudience,
  }));
}
