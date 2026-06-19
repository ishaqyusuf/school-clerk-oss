import {
  getClassroomReportSheet,
  getClassroomReportSheetSchema,
} from "@api/db/queries/report-sheet";
import {
  authenticatedProcedure,
  createTRPCRouter,
  publicProcedure,
} from "../init";
import { getClassrooms } from "@api/db/queries/classroom";

import {
  deleteAssessment,
  deleteAssessmentSchema,
  getAssessmentSuggestions,
  getAssessmentSuggestionsSchema,
  getSubjectAssessmentRecordings,
  getSubjectAssessmentRecordingsSchema,
  reorderAssessments,
  reorderAssessmentsSchema,
  saveAssessement,
  saveAssessementSchema,
  updateAssessmentScore,
  updateAssessmentScoreSchema,
} from "@api/db/queries/assessments";
import { classroomDisplayName } from "@school-clerk/utils";
import { z } from "zod";

const recordingContextOptionsSchema = z
  .object({
    termId: z.string().optional().nullable(),
  })
  .optional();

function findCurrentDatedTerm<
  T extends {
    startDate: Date | null;
    endDate: Date | null;
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

async function getReportTerms(ctx: Parameters<typeof getClassrooms>[0]) {
  const terms = await ctx.db.sessionTerm.findMany({
    where: {
      schoolId: ctx.profile.schoolId,
      deletedAt: null,
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
    sessionId: term.session?.id ?? null,
    sessionTitle: term.session?.title ?? null,
    label: [term.session?.title, term.title].filter(Boolean).join(" • "),
    startDate: term.startDate,
    endDate: term.endDate,
  }));
}

export const assessmentRouter = createTRPCRouter({
  getRecordingContextOptions: authenticatedProcedure
    .input(recordingContextOptionsSchema)
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.currentUser;

      if (currentUser.role !== "Teacher") {
        const terms = await getReportTerms(ctx);
        const currentDatedTerm = findCurrentDatedTerm(terms);
        const defaultTermId =
          (input?.termId && terms.some((term) => term.id === input.termId)
            ? input.termId
            : null) ??
          (terms.some((term) => term.id === ctx.profile.termId)
            ? ctx.profile.termId
            : null) ??
          currentDatedTerm?.id ??
          null;
        const classrooms = defaultTermId
          ? await getClassrooms(ctx, { sessionTermId: defaultTermId })
          : { data: [] };

        return {
          scoped: false,
          terms,
          classrooms: classrooms.data,
          defaultTermId,
          defaultDepartmentId: null,
        };
      }

      if (!ctx.profile.schoolId || !currentUser.email) {
        return {
          scoped: true,
          terms: [],
          classrooms: [],
          defaultTermId: null,
          defaultDepartmentId: null,
        };
      }

      const staffProfile = await ctx.db.staffProfile.findFirst({
        where: {
          deletedAt: null,
          schoolProfileId: ctx.profile.schoolId,
          email: {
            equals: currentUser.email,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

      if (!staffProfile) {
        return {
          scoped: true,
          terms: [],
          classrooms: [],
          defaultTermId: null,
          defaultDepartmentId: null,
        };
      }

      const termProfiles = await ctx.db.staffTermProfile.findMany({
        where: {
          deletedAt: null,
          staffProfileId: staffProfile.id,
          sessionTerm: {
            deletedAt: null,
            schoolId: ctx.profile.schoolId,
          },
        },
        select: {
          id: true,
          sessionTerm: {
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
          },
        },
      });

      const terms = termProfiles
        .map((profile) => profile.sessionTerm)
        .filter(Boolean)
        .sort((a, b) => {
          const aStart = a.startDate?.getTime() ?? 0;
          const bStart = b.startDate?.getTime() ?? 0;
          return bStart - aStart;
        })
        .map((term) => ({
          id: term.id,
          title: term.title,
          sessionId: term.session?.id ?? null,
          sessionTitle: term.session?.title ?? null,
          label: [term.session?.title, term.title].filter(Boolean).join(" • "),
          startDate: term.startDate,
          endDate: term.endDate,
        }));

      const termIds = terms.map((term) => term.id);
      const classroomAssignments = termIds.length
        ? await ctx.db.staffClassroomDepartmentTermProfiles.findMany({
            where: {
              deletedAt: null,
              staffTermProfile: {
                deletedAt: null,
                staffProfileId: staffProfile.id,
                sessionTermId: {
                  in: termIds,
                },
              },
              classRoomDepartment: {
                deletedAt: null,
                schoolProfileId: ctx.profile.schoolId,
              },
            },
            select: {
              staffTermProfile: {
                select: {
                  sessionTermId: true,
                },
              },
              classRoomDepartment: {
                select: {
                  id: true,
                  departmentName: true,
                  departmentLevel: true,
                  classRoom: {
                    select: {
                      id: true,
                      name: true,
                      classLevel: true,
                    },
                  },
                },
              },
            },
            orderBy: [
              {
                classRoomDepartment: {
                  classRoom: {
                    classLevel: "asc",
                  },
                },
              },
              {
                classRoomDepartment: {
                  departmentLevel: "asc",
                },
              },
              {
                classRoomDepartment: {
                  departmentName: "asc",
                },
              },
            ],
          })
        : [];

      const classroomsByTerm = new Map<
        string,
        Array<{
          id: string;
          departmentName: string | null;
          departmentLevel: number | null;
          classRoom: {
            id: string;
            name: string;
            classLevel: number | null;
          } | null;
          displayName: string;
        }>
      >();

      for (const assignment of classroomAssignments) {
        const termId = assignment.staffTermProfile.sessionTermId;
        const department = assignment.classRoomDepartment;
        if (!termId || !department) continue;

        const termClassrooms = classroomsByTerm.get(termId) ?? [];
        if (termClassrooms.some((classroom) => classroom.id === department.id)) {
          continue;
        }

        termClassrooms.push({
          ...department,
          displayName: classroomDisplayName({
            className: department.classRoom?.name,
            departmentName: department.departmentName,
          }),
        });
        classroomsByTerm.set(termId, termClassrooms);
      }

      const requestedTermId = input?.termId ?? null;
      const cookieTermId = ctx.profile.termId ?? null;
      const currentDatedTerm = findCurrentDatedTerm(terms);
      const hasTerm = (termId?: string | null) =>
        !!termId && terms.some((term) => term.id === termId);
      const firstAssignedTermId =
        terms.find((term) => (classroomsByTerm.get(term.id)?.length ?? 0) > 0)
          ?.id ?? null;
      const currentDatedTermId = currentDatedTerm?.id ?? null;
      const defaultTermId =
        (hasTerm(requestedTermId) ? requestedTermId : null) ??
        (hasTerm(cookieTermId) ? cookieTermId : null) ??
        (currentDatedTermId
          ? (classroomsByTerm.get(currentDatedTermId)?.length ?? 0) > 0
            ? currentDatedTermId
            : firstAssignedTermId ?? currentDatedTermId
          : null);

      const classrooms = defaultTermId
        ? (classroomsByTerm.get(defaultTermId) ?? [])
        : [];

      return {
        scoped: true,
        terms,
        classrooms,
        defaultTermId,
        defaultDepartmentId: classrooms[0]?.id ?? null,
      };
    }),
  saveAssessement: publicProcedure
    .input(saveAssessementSchema)
    .mutation(async (props) => {
      return saveAssessement(props.ctx, props.input);
    }),
  deleteAssessment: publicProcedure
    .input(deleteAssessmentSchema)
    .mutation(async (props) => {
      return deleteAssessment(props.ctx, props.input);
    }),
  reorderAssessments: publicProcedure
    .input(reorderAssessmentsSchema)
    .mutation(async (props) => {
      return reorderAssessments(props.ctx, props.input);
    }),
  getAssessmentSuggestions: publicProcedure
    .input(getAssessmentSuggestionsSchema)
    .query(async (props) => {
      return getAssessmentSuggestions(props.ctx, props.input);
    }),
  getSubjectAssessmentRecordings: publicProcedure
    .input(getSubjectAssessmentRecordingsSchema)
    .query(async (props) => {
      return getSubjectAssessmentRecordings(props.ctx, props.input);
    }),
  updateAssessmentScore: publicProcedure
    .input(updateAssessmentScoreSchema)
    .mutation(async (props) => {
      return updateAssessmentScore(props.ctx, props.input);
    }),
  getClassroomReportSheet: publicProcedure
    .input(getClassroomReportSheetSchema)
    .query(async (props) => {
      return getClassroomReportSheet(props.ctx, props.input);
    }),
  savePrintLog: publicProcedure
    .input(
      z.object({
        termFormIds: z.array(z.string()),
        departmentIds: z.array(z.string()),
        termId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.reportPrintLog.create({
        data: {
          schoolProfileId: ctx.profile.schoolId,
          termId: input.termId ?? ctx.profile.termId,
          termFormIds: input.termFormIds,
          departmentIds: input.departmentIds,
        },
      });
    }),
  getPrintLogs: publicProcedure
    .input(z.object({ termId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.reportPrintLog.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          termId: input.termId ?? ctx.profile.termId ?? undefined,
        },
        orderBy: { printedAt: "desc" },
        take: 50,
      });
    }),
});
