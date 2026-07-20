import { authenticatedProcedure, createTRPCRouter } from "../init";
import {
  createAcademicSessionSchema,
  getStudentTermsListSchema,
} from "../schemas/schemas";
import {
  academicTermIdSchema,
  academicTermSetupApplySchema,
  academicTermSetupSelectionSchema,
  createAcademicTermDraftSchema,
  saveAcademicTermDraftSchema,
} from "../schemas/academic-term-setup";

import {
  createAcademicSession,
  getStudentTermsList,
} from "@api/db/queries/academic-terms";
import {
  activateAcademicTerm,
  applyAcademicTermSetup,
  assertAcademicTermWritable,
  closeAcademicTerm,
  createAcademicTermDraft,
  getAcademicTermSetupContext,
  previewAcademicTermActivation,
  previewAcademicTermSetup,
  requireAcademicAdmin,
  saveAcademicTermDraft,
} from "@api/db/queries/academic-term-setup";
import {
  getClassroomDepartments,
  getClassroomsSchema,
} from "@api/db/queries/classroom";
import {
  entrollStudentToTerm,
  entrollStudentToTermSchema,
  studentDisplayName,
} from "@api/db/queries/enrollment-query";
import { assertNoExactDuplicateStudentInClassTerm } from "@api/db/queries/student-duplicates";
import { applyFeeHistoriesToStudentTermForm } from "@api/db/queries/student-fee-application";
import { classroomDisplayName, consoleLog } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";
import {
  addYears,
  constructNow,
  differenceInDays,
  format,
  sub,
  subDays,
} from "date-fns";
import { z } from "zod";

const previewApplicableFeeHistoriesSchema = z.object({
  sessionTermId: z.string(),
  classroomDepartmentId: z.string().optional().nullable(),
});

function findCurrentDatedTerm<
  T extends {
    startDate: Date | null;
    endDate: Date | null;
    createdAt?: Date | null;
  },
>(terms: T[], now = new Date()) {
  const startedTerms = terms.filter(
    (term) => term.startDate && term.startDate <= now,
  );
  const activeBoundedTerm = startedTerms
    .filter((term) => term.endDate && term.endDate >= now)
    .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0];

  if (activeBoundedTerm) return activeBoundedTerm;

  return (
    startedTerms
      .filter((term) => !term.endDate)
      .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0] ??
    null
  );
}

export const academicsRouter = createTRPCRouter({
  getReportTerms: authenticatedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const terms = await ctx.db.sessionTerm.findMany({
        where: {
          schoolId: ctx.profile.schoolId,
          deletedAt: null,
          startDate: {
            not: null,
          },
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          session: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [
          {
            startDate: {
              sort: "desc",
              nulls: "last",
            },
          },
          {
            createdAt: "desc",
          },
        ],
      });

      return terms.map((term) => ({
        id: term.id,
        title: term.title,
        sessionTitle: term.session?.title ?? null,
        label: [term.session?.title, term.title].filter(Boolean).join(" • "),
        startDate: term.startDate,
        endDate: term.endDate,
      }));
    }),
  dashboard: authenticatedProcedure.input(z.object({})).query(async (props) => {
    const { ctx, input } = props;
    const db = ctx.db;
    // return dashboard(props.ctx, props.input);
    const [sessions, school] = await Promise.all([
      db.schoolSession.findMany({
        where: {
          schoolId: ctx.profile.schoolId,
        },
        orderBy: {
          createdAt: {
            sort: "desc",
          },
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          terms: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              sessionId: true,
              title: true,
              startDate: true,
              endDate: true,
              createdAt: true,
              lifecycleStatus: true,
              setupCompletedAt: true,
              note: true,
            },
            orderBy: {
              startDate: {
                sort: "asc",
                nulls: "first",
              },
            },
          },
        },
      }),
      db.schoolProfile.findFirst({
        where: {
          id: ctx.profile.schoolId,
          deletedAt: null,
        },
        select: {
          activeSessionTermId: true,
        },
      }),
    ]);
    const now = new Date();
    const allTerms = sessions.flatMap((session) => session.terms);
    const currentTerm =
      allTerms.find((term) => term.id === school?.activeSessionTermId) ??
      findCurrentDatedTerm(
        allTerms.filter(
          (term) =>
            term.lifecycleStatus === null || term.lifecycleStatus === "ACTIVE",
        ),
        now,
      );
    const currentSessionId = currentTerm?.sessionId ?? ctx.profile.sessionId;
    const currentSessionIdx = sessions.findIndex(
      (s) => s.id === currentSessionId,
    );
    const currentSession = sessions[currentSessionIdx];
    const previousSession = sessions[currentSessionIdx + 1];
    const getFirstScheduledTerm = (terms: (typeof sessions)[number]["terms"]) =>
      terms
        .filter((term) => term.startDate !== null)
        .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())[0] ??
      [...terms].sort(
        (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
      )[0] ??
      null;
    const getLastScheduledTerm = (terms: (typeof sessions)[number]["terms"]) =>
      terms
        .filter((term) => term.startDate !== null)
        .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0] ??
      [...terms].sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      )[0] ??
      null;

    const promotionFirstTermId = currentSession
      ? getFirstScheduledTerm(currentSession.terms)?.id
      : null;
    const promotionLastTermId = previousSession
      ? getLastScheduledTerm(previousSession.terms)?.id
      : null;

    return {
      promotionIds:
        promotionFirstTermId && promotionLastTermId
          ? {
              lastTermId: promotionLastTermId,
              firstTermId: promotionFirstTermId,
            }
          : null,
      sessions: sessions.map((session) => {
        const isCurrent = session.id === currentSessionId;
        const hasPlanningTerm = session.terms.some(
          (term) =>
            term.lifecycleStatus === "DRAFT" ||
            term.lifecycleStatus === "READY" ||
            (!!term.startDate && term.startDate > now),
        );
        const duration =
          session.startDate && session.endDate
            ? `${format(session.startDate, "MMM yyyy")} - ${format(session.endDate, "MMM yyyy")}`
            : session.startDate
              ? `From ${format(session.startDate, "MMM yyyy")}`
              : "Not scheduled";
        return {
          id: session.id,
          currentTerm: isCurrent ? currentTerm : null,
          status: isCurrent
            ? "current"
            : !session.startDate || hasPlanningTerm
              ? "planning"
              : "archived",
          name: session.title,
          duration,
          activeTerm: isCurrent ? (currentTerm?.title ?? "Not started") : "—",
          terms: session.terms.map((term) => {
            const isCurrentTerm = currentTerm?.id === term.id;
            const isCompleted =
              !!term.endDate && differenceInDays(now, term.endDate) > 0;
            return {
              id: term.id,
              status:
                term.lifecycleStatus?.toLowerCase() ??
                (isCurrentTerm
                  ? "current"
                  : isCompleted
                    ? "completed"
                    : "upcoming"),
              title: term.title,
              startDate: term.startDate,
              endDate: term.endDate,
              lifecycleStatus: term.lifecycleStatus,
              setupCompletedAt: term.setupCompletedAt,
              note: term.note,
            };
          }),
        };
      }),
    };
  }),
  saveTermMetaData: authenticatedProcedure
    .input(saveAcademicTermDraftSchema)
    .mutation(({ ctx, input }) => saveAcademicTermDraft(ctx, input)),
  getStudentTermsList: authenticatedProcedure
    .input(getStudentTermsListSchema)
    .query(async (props) => {
      return getStudentTermsList(props.ctx, props.input);
    }),
  createAcademicSession: authenticatedProcedure
    .input(createAcademicSessionSchema)
    .mutation(async (props) => {
      return createAcademicSession(props.ctx, props.input);
    }),
  createAcademicTerm: authenticatedProcedure
    .input(
      z.object({
        currentTermId: z.string(),
        currentSessionId: z.string(),
        title: z.string(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createAcademicTermDraft(ctx, {
        sessionId: input.currentSessionId,
        title: input.title,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
    ),
  createTermDraft: authenticatedProcedure
    .input(createAcademicTermDraftSchema)
    .mutation(({ ctx, input }) => createAcademicTermDraft(ctx, input)),
  getTermSetupContext: authenticatedProcedure
    .input(
      academicTermIdSchema.extend({
        previousTermId: z.string().optional().nullable(),
      }),
    )
    .query(({ ctx, input }) =>
      getAcademicTermSetupContext(ctx, {
        termId: input.termId!,
        previousTermId: input.previousTermId,
      }),
    ),
  previewTermSetup: authenticatedProcedure
    .input(academicTermSetupSelectionSchema)
    .query(({ ctx, input }) => previewAcademicTermSetup(ctx, input)),
  applyTermSetup: authenticatedProcedure
    .input(academicTermSetupApplySchema)
    .mutation(({ ctx, input }) => applyAcademicTermSetup(ctx, input)),
  previewTermActivation: authenticatedProcedure
    .input(academicTermIdSchema)
    .query(({ ctx, input }) =>
      previewAcademicTermActivation(ctx, { termId: input.termId! }),
    ),
  activateTerm: authenticatedProcedure
    .input(academicTermIdSchema)
    .mutation(({ ctx, input }) =>
      activateAcademicTerm(ctx, { termId: input.termId! }),
    ),
  closeTerm: authenticatedProcedure
    .input(academicTermIdSchema)
    .mutation(({ ctx, input }) =>
      closeAcademicTerm(ctx, { termId: input.termId! }),
    ),
  entrollStudentToTerm: authenticatedProcedure
    .input(entrollStudentToTermSchema)
    .mutation(async (props) => {
      return entrollStudentToTerm(props.ctx, props.input);
    }),
  getClassrooms: authenticatedProcedure
    .input(getClassroomsSchema)
    .query(async (props) => {
      return getClassroomDepartments(props.ctx, props.input);
    }),
  previewApplicableFeeHistories: authenticatedProcedure
    .input(previewApplicableFeeHistoriesSchema)
    .query(async ({ ctx, input }) => {
      if (!input.classroomDepartmentId) return [];
      const items = await ctx.db.financeItem.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          isActive: true,
          applicableClasses: {
            some: { classRoomDepartmentId: input.classroomDepartmentId },
          },
        },
        include: { stream: true },
      });
      return items.map((item) => ({
        feeHistoryId: item.id,
        title: item.name,
        amount: Number(item.amount),
        description: item.description,
        scope: "Classroom",
        streamName: item.stream.name,
      }));
    }),
  migrateTermData: authenticatedProcedure
    .input(
      z.object({
        termId: z.string(),
        sessionId: z.string(),
        previousTermId: z.string(),
        classroomOption: z.enum(["copy-all", "select", "empty"]),
        subjectOption: z.enum(["copy-all", "select", "empty"]),
        studentOption: z.enum(["copy-all", "select", "empty"]),
        autoPromote: z.boolean().optional().nullable(),
        selectedSubjectIds: z.array(z.string()).optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) =>
      applyAcademicTermSetup(ctx, {
        termId: input.termId,
        previousTermId: input.previousTermId,
        classroomOption: input.classroomOption,
        subjectOption: input.subjectOption,
        studentOption: input.studentOption,
        teacherOption: "copy-all",
        selectedClassroomIds: [],
        selectedSubjectIds: input.selectedSubjectIds ?? [],
        selectedStudentIds: [],
        selectedTeacherIds: [],
        idempotencyKey: `legacy-${input.termId}-${input.previousTermId}`,
      }),
    ),
  getSessionPrefill: authenticatedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = ctx.db;
      const latestSession = await db.schoolSession.findFirst({
        where: { schoolId: ctx.profile.schoolId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          terms: {
            where: { deletedAt: null },
            orderBy: { startDate: { sort: "asc", nulls: "last" } },
            select: { id: true, title: true, startDate: true, endDate: true },
          },
        },
      });
      if (!latestSession) return null;

      const titleMatch = latestSession.title?.match(/^(\d{4})\/(\d{4})$/);
      const suggestedTitle =
        titleMatch?.[1] && titleMatch[2]
          ? `${parseInt(titleMatch[1]) + 1}/${parseInt(titleMatch[2]) + 1}`
          : latestSession.title
            ? `${latestSession.title} (New)`
            : "";

      const lastTerm =
        latestSession.terms[latestSession.terms.length - 1] ?? null;

      return {
        suggestedTitle,
        suggestedStartDate: latestSession.startDate
          ? addYears(latestSession.startDate, 1)
          : null,
        suggestedEndDate: latestSession.endDate
          ? addYears(latestSession.endDate, 1)
          : null,
        lastTermId: lastTerm?.id ?? null,
        previousTerms: latestSession.terms.map((t) => ({
          id: t.id,
          title: t.title,
          startDate: t.startDate ? addYears(t.startDate, 1) : null,
          endDate: t.endDate ? addYears(t.endDate, 1) : null,
        })),
      };
    }),
  getPromotionStudents: authenticatedProcedure
    .input(
      z.object({
        lastTermId: z.string(),
        firstTermId: z.string(),
        classroomDepartmentId: z.string().optional().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAcademicAdmin(ctx);
      const db = ctx.db;

      const [lastTerm, firstTerm] = await Promise.all([
        db.sessionTerm.findFirst({
          where: {
            id: input.lastTermId,
            schoolId: ctx.profile.schoolId,
            deletedAt: null,
          },
          select: { title: true, session: { select: { title: true } } },
        }),
        db.sessionTerm.findFirst({
          where: {
            id: input.firstTermId,
            schoolId: ctx.profile.schoolId,
            deletedAt: null,
          },
          select: { title: true, session: { select: { title: true } } },
        }),
      ]);
      if (!lastTerm || !firstTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected progression terms were not found.",
        });
      }

      const lastTermForms = await db.studentTermForm.findMany({
        where: {
          sessionTermId: input.lastTermId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
          ...(input.classroomDepartmentId
            ? { classroomDepartmentId: input.classroomDepartmentId }
            : {}),
        },
        select: {
          id: true,
          studentId: true,
          classroomDepartmentId: true,
          student: {
            select: { id: true, name: true, surname: true, otherName: true },
          },
          classroomDepartment: {
            select: {
              classRoomsId: true,
              id: true,
              departmentName: true,
              departmentLevel: true,
              classRoom: { select: { id: true, name: true, classLevel: true } },
            },
          },
          assessmentRecords: {
            where: { deletedAt: null },
            select: { obtained: true, percentageScore: true },
          },
        },
      });

      const promotedForms = await db.studentTermForm.findMany({
        where: {
          sessionTermId: input.firstTermId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        select: {
          studentId: true,
          id: true,
          createdAt: true,
          classroomDepartmentId: true,
          _count: {
            select: {
              assessmentRecords: true,
            },
          },
          classroomDepartment: {
            select: {
              classRoomsId: true,
              departmentName: true,
              departmentLevel: true,
              classRoom: { select: { id: true, name: true, classLevel: true } },
            },
          },
        },
      });
      const promotedFormMap = new Map<string, (typeof promotedForms)[number]>();
      for (const form of promotedForms) {
        if (!form.studentId) continue;
        const existing = promotedFormMap.get(form.studentId);
        if (!existing) {
          promotedFormMap.set(form.studentId, form);
          continue;
        }
        const formRelations = form._count.assessmentRecords;
        const existingRelations = existing._count.assessmentRecords;
        if (
          formRelations > existingRelations ||
          (formRelations === existingRelations &&
            (form.createdAt?.getTime() ?? 0) <
              (existing.createdAt?.getTime() ?? 0))
        ) {
          promotedFormMap.set(form.studentId, form);
        }
      }

      const students = lastTermForms.map((form) => {
        const targetForm = promotedFormMap.get(form.studentId!);
        const scores = form.assessmentRecords
          .map((r) => r.percentageScore)
          .filter((s): s is number => s !== null);
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
        const sourceClassLevel =
          form.classroomDepartment?.classRoom?.classLevel ?? null;
        const sourceDepartmentLevel =
          form.classroomDepartment?.departmentLevel ?? null;
        const sourceClassRoomId =
          form.classroomDepartment?.classRoom?.id ?? null;
        const sourceClassRoomName =
          form.classroomDepartment?.classRoom?.name ?? null;
        const sourceDepartmentName =
          form.classroomDepartment?.departmentName ?? null;
        const targetClassLevel =
          targetForm?.classroomDepartment?.classRoom?.classLevel ?? null;
        const targetDepartmentLevel =
          targetForm?.classroomDepartment?.departmentLevel ?? null;
        const targetClassRoomId =
          targetForm?.classroomDepartment?.classRoom?.id ?? null;
        const targetClassRoomName =
          targetForm?.classroomDepartment?.classRoom?.name ?? null;
        const targetDepartmentName =
          targetForm?.classroomDepartment?.departmentName ?? null;
        const isRepeatedTarget =
          targetForm?.classroomDepartmentId === form.classroomDepartmentId ||
          (!!targetForm &&
            targetClassLevel === sourceClassLevel &&
            targetDepartmentLevel === sourceDepartmentLevel &&
            ((targetClassRoomId !== null &&
              targetClassRoomId === sourceClassRoomId) ||
              (targetClassRoomName !== null &&
                targetClassRoomName === sourceClassRoomName)) &&
            targetDepartmentName === sourceDepartmentName);
        const progressionStatus = !targetForm
          ? "undecided"
          : isRepeatedTarget
            ? "repeated"
            : "promoted";

        return {
          termFormId: form.id,
          studentId: form.studentId!,
          name: form.student
            ? studentDisplayName(form.student, ctx.profile.studentNameFormat)
            : "Student",
          className: form.classroomDepartment?.departmentName ?? null,
          classRoomId: form.classroomDepartment?.classRoom?.id ?? null,
          classRoomName: form.classroomDepartment?.classRoom?.name ?? null,
          classroomDepartmentId: form.classroomDepartmentId!,
          classLevel: sourceClassLevel,
          departmentLevel: sourceDepartmentLevel,
          avgScore,
          isPromoted: !!targetForm,
          progressionStatus,
          firstTermFormId: targetForm?.id ?? null,
          targetClassroomDepartmentId:
            targetForm?.classroomDepartmentId ?? null,
          targetClassName:
            targetForm?.classroomDepartment?.departmentName ?? null,
          targetClassLevel,
          targetDepartmentLevel,
        };
      });

      return {
        students,
        meta: {
          fromTerm: lastTerm?.title ?? null,
          fromSession: lastTerm?.session?.title ?? null,
          toTerm: firstTerm?.title ?? null,
          toSession: firstTerm?.session?.title ?? null,
        },
      };
    }),
  getPromotionClassrooms: authenticatedProcedure
    .input(
      z.object({
        lastTermId: z.string(),
        firstTermId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAcademicAdmin(ctx);
      const db = ctx.db;

      const [lastTerm, firstTerm, classroomForms] = await Promise.all([
        db.sessionTerm.findFirst({
          where: {
            id: input.lastTermId,
            schoolId: ctx.profile.schoolId,
            deletedAt: null,
          },
          select: { title: true, session: { select: { title: true } } },
        }),
        db.sessionTerm.findFirst({
          where: {
            id: input.firstTermId,
            schoolId: ctx.profile.schoolId,
            deletedAt: null,
          },
          select: { title: true, session: { select: { title: true } } },
        }),
        db.studentTermForm.findMany({
          where: {
            sessionTermId: input.lastTermId,
            deletedAt: null,
            schoolProfileId: ctx.profile.schoolId,
          },
          select: {
            classroomDepartmentId: true,
            classroomDepartment: {
              select: {
                classRoomsId: true,
                departmentName: true,
                departmentLevel: true,
                classRoom: {
                  select: { id: true, name: true, classLevel: true },
                },
              },
            },
          },
          distinct: ["classroomDepartmentId"],
        }),
      ]);
      if (!lastTerm || !firstTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected progression terms were not found.",
        });
      }

      const classrooms = classroomForms
        .filter((form) => form.classroomDepartmentId)
        .map((form) => ({
          id: form.classroomDepartmentId!,
          classRoomId:
            form.classroomDepartment?.classRoom?.id ??
            form.classroomDepartment?.classRoomsId ??
            form.classroomDepartmentId!,
          classRoomName:
            form.classroomDepartment?.classRoom?.name ??
            form.classroomDepartment?.departmentName ??
            form.classroomDepartmentId!,
          name: classroomDisplayName({
            className: form.classroomDepartment?.classRoom?.name,
            departmentName:
              form.classroomDepartment?.departmentName ??
              form.classroomDepartmentId!,
          }),
          departmentName:
            form.classroomDepartment?.departmentName ??
            form.classroomDepartmentId!,
          classLevel: form.classroomDepartment?.classRoom?.classLevel ?? null,
          departmentLevel: form.classroomDepartment?.departmentLevel ?? null,
        }))
        .sort((a, b) => {
          const classLevelOrder =
            (a.classLevel ?? 9999) - (b.classLevel ?? 9999);
          if (classLevelOrder !== 0) return classLevelOrder;
          return (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999);
        });

      return {
        classrooms,
        meta: {
          fromTerm: lastTerm?.title ?? null,
          fromSession: lastTerm?.session?.title ?? null,
          toTerm: firstTerm?.title ?? null,
          toSession: firstTerm?.session?.title ?? null,
        },
      };
    }),
  getStudentTermPerformance: authenticatedProcedure
    .input(z.object({ studentId: z.string(), termId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const termForm = await db.studentTermForm.findFirst({
        where: {
          studentId: input.studentId,
          sessionTermId: input.termId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        select: {
          id: true,
          classroomDepartment: {
            select: { departmentName: true },
          },
          sessionTerm: {
            select: {
              title: true,
              session: { select: { title: true } },
            },
          },
          student: { select: { name: true, surname: true } },
          assessmentRecords: {
            where: { deletedAt: null },
            select: {
              obtained: true,
              percentageScore: true,
              classSubjectAssessment: {
                select: {
                  title: true,
                  obtainable: true,
                  departmentSubject: {
                    select: {
                      subject: { select: { title: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      return termForm;
    }),
  batchPromote: authenticatedProcedure
    .input(
      z.object({
        studentIds: z.array(z.string()),
        fromTermId: z.string(),
        toTermId: z.string(),
        mode: z.enum(["promote", "repeat"]).default("promote"),
        toClassroomDepartmentId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAcademicAdmin(ctx);
      const db = ctx.db;
      const [fromTerm, toTerm] = await Promise.all([
        db.sessionTerm.findFirst({
          where: {
            id: input.fromTermId,
            schoolId: ctx.profile.schoolId,
            deletedAt: null,
          },
          select: { id: true, sessionId: true },
        }),
        db.sessionTerm.findFirst({
          where: {
            id: input.toTermId,
            schoolId: ctx.profile.schoolId,
            deletedAt: null,
          },
          select: { id: true, sessionId: true, schoolId: true },
        }),
      ]);
      if (!fromTerm || !toTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected progression terms were not found.",
        });
      }
      await assertAcademicTermWritable(ctx, toTerm.id);
      if (
        fromTerm.sessionId !== toTerm.sessionId &&
        !input.toClassroomDepartmentId
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Select a target classroom before progressing students into a new session.",
        });
      }
      const requestedTargetDepartment = input.toClassroomDepartmentId
        ? await db.classRoomDepartment.findFirst({
            where: {
              id: input.toClassroomDepartmentId,
              schoolProfileId: ctx.profile.schoolId,
              deletedAt: null,
              classRoom: {
                schoolProfileId: ctx.profile.schoolId,
                schoolSessionId: toTerm.sessionId,
                deletedAt: null,
              },
            },
            select: { id: true },
          })
        : null;
      if (input.toClassroomDepartmentId && !requestedTargetDepartment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The selected target classroom does not belong to the new academic session.",
        });
      }
      const sourceTermForms = await db.studentTermForm.findMany({
        where: {
          sessionTermId: input.fromTermId,
          studentId: { in: input.studentIds },
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        select: {
          studentId: true,
          classroomDepartmentId: true,
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
              otherName: true,
            },
          },
        },
      });

      return db.$transaction(async (tx) => {
        let skippedDuplicates = 0;
        for (const form of sourceTermForms) {
          if (!form.studentId) continue;
          const targetClassroomDepartmentId =
            input.toClassroomDepartmentId ?? form.classroomDepartmentId;

          if (form.student && targetClassroomDepartmentId) {
            try {
              await assertNoExactDuplicateStudentInClassTerm(tx, {
                schoolProfileId: ctx.profile.schoolId,
                sessionTermId: input.toTermId,
                classroomDepartmentId: targetClassroomDepartmentId,
                name: form.student.name,
                surname: form.student.surname,
                otherName: form.student.otherName,
                excludeStudentIds: [form.student.id],
              });
            } catch (error) {
              if (error instanceof TRPCError && error.code === "CONFLICT") {
                skippedDuplicates += 1;
                continue;
              }
              throw error;
            }
          }

          let sessionForm = await tx.studentSessionForm.findFirst({
            where: {
              studentId: form.studentId,
              schoolSessionId: toTerm.sessionId,
              deletedAt: null,
            },
            select: { id: true, classroomDepartmentId: true },
          });
          if (!sessionForm) {
            sessionForm = await tx.studentSessionForm.create({
              data: {
                studentId: form.studentId,
                schoolSessionId: toTerm.sessionId,
                schoolProfileId: ctx.profile.schoolId,
                classroomDepartmentId: targetClassroomDepartmentId,
              },
              select: { id: true, classroomDepartmentId: true },
            });
          } else if (
            sessionForm.classroomDepartmentId !== targetClassroomDepartmentId
          ) {
            sessionForm = await tx.studentSessionForm.update({
              where: { id: sessionForm.id },
              data: {
                classroomDepartmentId: targetClassroomDepartmentId,
              },
              select: { id: true, classroomDepartmentId: true },
            });
          }
          const existingForms = await tx.studentTermForm.findMany({
            where: {
              studentId: form.studentId,
              sessionTermId: input.toTermId,
              deletedAt: null,
              schoolProfileId: ctx.profile.schoolId,
            },
            select: {
              id: true,
              createdAt: true,
              _count: {
                select: {
                  assessmentRecords: true,
                },
              },
            },
          });
          const [existing, ...duplicates] = existingForms.sort((a, b) => {
            const aRelations = a._count.assessmentRecords;
            const bRelations = b._count.assessmentRecords;
            if (aRelations !== bRelations) return bRelations - aRelations;
            return (
              (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
            );
          });
          if (duplicates.length) {
            await tx.studentTermForm.updateMany({
              where: {
                id: { in: duplicates.map((duplicate) => duplicate.id) },
              },
              data: { deletedAt: new Date() },
            });
          }

          const termForm = existing
            ? await tx.studentTermForm.update({
                where: { id: existing.id },
                data: {
                  studentSessionFormId: sessionForm.id,
                  classroomDepartmentId: targetClassroomDepartmentId,
                  schoolSessionId: toTerm.sessionId,
                  schoolProfileId: ctx.profile.schoolId,
                },
                select: { id: true },
              })
            : await tx.studentTermForm.create({
                data: {
                  studentId: form.studentId,
                  studentSessionFormId: sessionForm.id,
                  classroomDepartmentId: targetClassroomDepartmentId,
                  schoolSessionId: toTerm.sessionId,
                  schoolProfileId: ctx.profile.schoolId,
                  sessionTermId: input.toTermId,
                },
                select: { id: true },
              });

          if (targetClassroomDepartmentId) {
            await applyFeeHistoriesToStudentTermForm(tx, {
              schoolProfileId: ctx.profile.schoolId,
              studentId: form.studentId,
              studentTermFormId: termForm.id,
              schoolSessionId: toTerm.sessionId,
              sessionTermId: input.toTermId,
              classroomDepartmentId: targetClassroomDepartmentId,
            });
          }
        }
        return {
          promoted: sourceTermForms.length - skippedDuplicates,
          skippedDuplicates,
          mode: input.mode,
        };
      });
    }),
  reversePromotion: authenticatedProcedure
    .input(z.object({ studentIds: z.array(z.string()), termId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAcademicAdmin(ctx);
      await assertAcademicTermWritable(ctx, input.termId);
      const db = ctx.db;
      const result = await db.studentTermForm.updateMany({
        where: {
          studentId: { in: input.studentIds },
          sessionTermId: input.termId,
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
        },
        data: { deletedAt: new Date() },
      });
      return { success: true, reversed: result.count };
    }),
});
