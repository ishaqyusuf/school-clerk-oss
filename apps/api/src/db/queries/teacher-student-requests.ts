import { assertTeacherCanAccessClassroomDepartment } from "@api/lib/teacher-authorization";
import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertAcademicTermWritable } from "./academic-term-setup";
import { partitionStudentsByTermEligibility, recordActivity } from "@school-clerk/db";
import { activityClassroomRef, activityStudentRef, activityTermRef } from "@school-clerk/utils/activity-refs";
import { STUDENT_WITHDRAWAL_ERROR_MESSAGE } from "@school-clerk/utils/student-withdrawal";

export const submitClassStudentSchema = z.object({
  classroomDepartmentId: z.string().min(1),
  sessionTermId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  surname: z.string().trim().max(100).optional(),
  otherName: z.string().trim().max(100).optional(),
  gender: z.enum(["Male", "Female"]),
});

export const reviewClassStudentSchema = z.object({
  studentTermFormId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  matchStudentId: z.string().min(1).optional(),
  note: z.string().trim().max(500).optional(),
}).refine((value) => value.decision === "APPROVED" || !value.matchStudentId, {
  message: "A rejected submission cannot be matched to a student.",
  path: ["matchStudentId"],
});

function requireScope(ctx: TRPCContext) {
  const schoolProfileId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  if (!schoolProfileId || !userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Select a signed-in school workspace." });
  }
  return { schoolProfileId, userId };
}

export async function submitClassStudent(
  ctx: TRPCContext,
  input: z.infer<typeof submitClassStudentSchema>,
) {
  const { schoolProfileId, userId } = requireScope(ctx);
  await assertTeacherCanAccessClassroomDepartment(ctx, input.classroomDepartmentId, input.sessionTermId);
  await assertAcademicTermWritable(ctx, input.sessionTermId);

  return ctx.db.$transaction(async (tx) => {
    const term = await tx.sessionTerm.findFirst({
      where: { id: input.sessionTermId, schoolId: schoolProfileId, deletedAt: null },
      select: { sessionId: true, lifecycleStatus: true },
    });
    const classroom = term && await tx.classRoomDepartment.findFirst({
      where: {
        id: input.classroomDepartmentId,
        schoolProfileId,
        deletedAt: null,
        classRoom: { deletedAt: null, schoolSessionId: term.sessionId, schoolProfileId },
      },
      select: { id: true },
    });
    if (!term || !classroom || term.lifecycleStatus === "CLOSED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Select an open term and classroom in this school." });
    }

    const existingRequest = await tx.studentTermForm.findFirst({
      where: {
        schoolProfileId,
        sessionTermId: input.sessionTermId,
        classroomDepartmentId: input.classroomDepartmentId,
        registrationReviewStatus: "PENDING",
        deletedAt: null,
        student: {
          name: { equals: input.name, mode: "insensitive" },
          surname: { equals: input.surname || null, mode: "insensitive" },
          otherName: { equals: input.otherName || null, mode: "insensitive" },
          deletedAt: null,
        },
      },
      select: { id: true },
    });
    if (existingRequest) {
      throw new TRPCError({ code: "CONFLICT", message: "This student already has a pending request in this classroom." });
    }

    const student = await tx.students.create({
      data: {
        name: input.name,
        surname: input.surname || null,
        otherName: input.otherName || null,
        gender: input.gender,
        schoolProfileId,
      },
      select: { id: true },
    });
    const sessionForm = await tx.studentSessionForm.create({
      data: {
        studentId: student.id,
        schoolProfileId,
        schoolSessionId: term.sessionId,
        classroomDepartmentId: classroom.id,
      },
      select: { id: true },
    });
    return tx.studentTermForm.create({
      data: {
        studentId: student.id,
        studentSessionFormId: sessionForm.id,
        schoolProfileId,
        schoolSessionId: term.sessionId,
        sessionTermId: input.sessionTermId,
        classroomDepartmentId: classroom.id,
        registrationReviewStatus: "PENDING",
        registrationRequestedByUserId: userId,
      },
      select: { id: true, studentId: true, registrationReviewStatus: true },
    });
  }, { isolationLevel: "Serializable" });
}

export async function listClassStudentRequests(ctx: TRPCContext) {
  const { schoolProfileId } = requireScope(ctx);
  return ctx.db.studentTermForm.findMany({
    where: {
      schoolProfileId,
      registrationRequestedByUserId: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      studentId: true,
      sessionTermId: true,
      classroomDepartmentId: true,
      registrationReviewStatus: true,
      registrationRequestedByUserId: true,
      registrationReviewedAt: true,
      registrationReviewNote: true,
      createdAt: true,
      student: { select: { name: true, surname: true, otherName: true, gender: true } },
      sessionTerm: { select: { title: true } },
      classroomDepartment: {
        select: { departmentName: true, classRoom: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getClassStudentMatches(ctx: TRPCContext, studentTermFormId: string) {
  const { schoolProfileId } = requireScope(ctx);
  const request = await ctx.db.studentTermForm.findFirst({
    where: { id: studentTermFormId, schoolProfileId, registrationRequestedByUserId: { not: null }, deletedAt: null },
    select: { studentId: true, sessionTermId: true, student: { select: { name: true, surname: true, otherName: true } } },
  });
  if (!request?.student) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found." });
  const name = request.student.name.trim();
  const surname = request.student.surname?.trim();
  const candidates = await ctx.db.students.findMany({
    where: {
      schoolProfileId,
      deletedAt: null,
      id: { not: request.studentId ?? undefined },
      termForms: { none: {
        registrationRequestedByUserId: { not: null },
        registrationReviewStatus: { in: ["PENDING", "REJECTED"] },
      } },
      OR: [
        { name: { contains: name, mode: "insensitive" } },
        ...(surname ? [{ surname: { contains: surname, mode: "insensitive" as const } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      surname: true,
      otherName: true,
      gender: true,
      termForms: {
        where: { deletedAt: null, schoolProfileId },
        select: { sessionTermId: true, sessionTerm: { select: { title: true } } },
        take: 8,
        orderBy: { createdAt: "desc" },
      },
    },
    take: 30,
  });
  return candidates.map((candidate) => ({
    ...candidate,
    alreadyInTerm: candidate.termForms.some((form) => form.sessionTermId === request.sessionTermId),
  }));
}

type ReviewedRequest = {
  student: { id: string; name: string; surname: string | null; otherName: string | null } | null;
  classroomDepartment: { id: string; departmentName: string | null; classRoom: { name: string | null } | null } | null;
  sessionTerm: { id: string; title: string | null; session: { title: string | null } | null } | null;
};

/**
 * An approved teacher submission either becomes a new student
 * (`student_created`, source "teacher_request") or, when matched to an existing
 * student, enrolls that student in the class term (`student_enrolled`).
 */
async function recordTeacherRequestApprovalActivity(
  ctx: TRPCContext,
  tx: Pick<TRPCContext["db"], "activity">,
  request: ReviewedRequest,
  matchedStudent: ReviewedRequest["student"],
) {
  const studentRow = matchedStudent ?? request.student;
  const classroom = activityClassroomRef(request.classroomDepartment);
  const term = activityTermRef(request.sessionTerm);
  if (!studentRow || !ctx.profile.schoolId) return;
  const student = activityStudentRef(studentRow, ctx.profile.studentNameFormat);
  const userId = ctx.currentUser?.id ?? "system";
  const author = ctx.currentUser?.name ?? "School Clerk user";
  const where = classroom ? ` in ${classroom.name}` : "";
  if (matchedStudent) {
    if (!classroom || !term) return;
    await recordActivity(tx, {
      schoolId: ctx.profile.schoolId, type: "student_enrolled", userId, author,
      title: "Student enrolled",
      description: `${author} enrolled ${student.name}${where} for ${term.name} from a teacher submission.`,
      meta: { student, classroom, term },
      subject: { type: "student", id: student.id },
    });
    return;
  }
  await recordActivity(tx, {
    schoolId: ctx.profile.schoolId, type: "student_created", userId, author,
    title: "Student registered",
    description: `${author} approved ${student.name}${where} from a teacher submission.`,
    meta: { student, classroom, term, source: "teacher_request" },
    subject: { type: "student", id: student.id },
  });
}

export async function reviewClassStudent(
  ctx: TRPCContext,
  input: z.infer<typeof reviewClassStudentSchema>,
) {
  const { schoolProfileId, userId } = requireScope(ctx);
  return ctx.db.$transaction(async (tx) => {
    let matchedStudent: { id: string; name: string; surname: string | null; otherName: string | null } | null = null;
    const request = await tx.studentTermForm.findFirst({
      where: {
        id: input.studentTermFormId,
        schoolProfileId,
        registrationReviewStatus: "PENDING",
        registrationRequestedByUserId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true, studentId: true, studentSessionFormId: true,
        schoolSessionId: true, sessionTermId: true,
        student: { select: { id: true, name: true, surname: true, otherName: true } },
        classroomDepartment: { select: { id: true, departmentName: true, classRoom: { select: { name: true } } } },
        sessionTerm: { select: { id: true, title: true, session: { select: { title: true } } } },
      },
    });
    if (!request?.studentId || !request.sessionTermId || !request.schoolSessionId) {
      throw new TRPCError({ code: "CONFLICT", message: "This pending submission is no longer available." });
    }
    const term = await tx.sessionTerm.findFirst({
      where: { id: request.sessionTermId, schoolId: schoolProfileId, deletedAt: null },
      select: { lifecycleStatus: true },
    });
    if (!term || term.lifecycleStatus === "CLOSED") {
      throw new TRPCError({ code: "CONFLICT", message: "The term is closed or unavailable." });
    }

    if (input.decision === "APPROVED" && input.matchStudentId) {
      const match = await tx.students.findFirst({
        where: {
          id: input.matchStudentId,
          schoolProfileId,
          deletedAt: null,
          termForms: { none: {
            registrationRequestedByUserId: { not: null },
            registrationReviewStatus: { in: ["PENDING", "REJECTED"] },
          } },
        },
        select: { id: true, name: true, surname: true, otherName: true },
      });
      if (!match || match.id === request.studentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Select a different existing student in this school." });
      }
      matchedStudent = match;
      if (request.sessionTermId) {
        const eligibility = await partitionStudentsByTermEligibility(tx, {
          schoolId: schoolProfileId,
          termId: request.sessionTermId,
          studentIds: [match.id],
          lock: true,
        });
        if (eligibility.withdrawn.length) {
          throw new TRPCError({ code: "CONFLICT", message: STUDENT_WITHDRAWAL_ERROR_MESSAGE });
        }
      }
      const currentTermForm = await tx.studentTermForm.findFirst({
        where: { studentId: match.id, schoolProfileId, sessionTermId: request.sessionTermId, deletedAt: null },
        select: { id: true },
      });
      if (currentTermForm) {
        throw new TRPCError({ code: "CONFLICT", message: "This student already has a record in the selected term." });
      }
      const existingSessionForm = await tx.studentSessionForm.findFirst({
        where: { studentId: match.id, schoolProfileId, schoolSessionId: request.schoolSessionId, deletedAt: null },
        select: { id: true },
      });
      if (existingSessionForm) {
        await tx.studentTermForm.update({ where: { id: request.id }, data: { studentSessionFormId: existingSessionForm.id } });
        await tx.studentSessionForm.update({ where: { id: request.studentSessionFormId }, data: { deletedAt: new Date() } });
      } else {
        await tx.studentSessionForm.update({ where: { id: request.studentSessionFormId }, data: { studentId: match.id } });
      }
      await tx.studentAssessmentRecord.updateMany({
        where: { studentTermFormId: request.id, studentId: request.studentId },
        data: { studentId: match.id },
      });
      await tx.studentAssessmentRecordHistory.updateMany({
        where: { studentTermFormId: request.id, studentId: request.studentId },
        data: { studentId: match.id },
      });
      await tx.students.update({ where: { id: request.studentId }, data: { deletedAt: new Date() } });
    }

    const reviewed = await tx.studentTermForm.update({
      where: { id: request.id },
      data: {
        ...(input.decision === "APPROVED" && input.matchStudentId ? { studentId: input.matchStudentId } : {}),
        registrationReviewStatus: input.decision,
        registrationReviewedByUserId: userId,
        registrationReviewedAt: new Date(),
        registrationReviewNote: input.note || null,
      },
      select: { id: true, studentId: true, registrationReviewStatus: true },
    });
    if (input.decision === "APPROVED") {
      await recordTeacherRequestApprovalActivity(ctx, tx, request, matchedStudent);
    }
    return reviewed;
  }, { isolationLevel: "Serializable" });
}
