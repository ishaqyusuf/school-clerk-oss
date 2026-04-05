import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  applyPayment,
  applyPaymentSchema,
  cancelStudentFee,
  cancelStudentFeeSchema,
  cancelStudentPayment,
  cancelStudentPaymentSchema,
  createSchoolFee,
  createSchoolFeeSchema,
  createStudentFee,
  createStudentFeeSchema,
  getStudentAccounting,
  getTermFees,
} from "@api/db/queries/accounting";
export const transactionRoutes = createTRPCRouter({
  applyPayment: publicProcedure
    .input(applyPaymentSchema)
    .mutation(async (props) => {
      return applyPayment(props.ctx, props.input);
    }),
  cancelStudentFee: publicProcedure
    .input(cancelStudentFeeSchema)
    .mutation(async (props) => {
      return cancelStudentFee(props.ctx, props.input);
    }),
  cancelStudentPayment: publicProcedure
    .input(cancelStudentPaymentSchema)
    .mutation(async (props) => {
      return cancelStudentPayment(props.ctx, props.input);
    }),
  createSchoolFee: publicProcedure
    .input(createSchoolFeeSchema)
    .mutation(async (props) => {
      return createSchoolFee(props.ctx, props.input);
    }),
  createStudentFee: publicProcedure
    .input(createStudentFeeSchema)
    .mutation(async (props) => {
      return createStudentFee(props.ctx, props.input);
    }),

  studentAccounting: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
      })
    )
    .query(async (props) => {
      return getStudentAccounting(props.ctx, props.input.studentId);
    }),
  getTermFees: publicProcedure
    .input(
      z.object({
        termId: z.string(),
      })
    )
    .query(async (props) => {
      const result = await getTermFees(props.ctx, props.input.termId);
      return result;
    }),

  getSchoolFees: publicProcedure
    .input(
      z
        .object({
          termId: z.string().optional().nullable(),
          title: z.string().optional().nullable(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const termId = input?.termId || ctx.profile.termId;
      return ctx.db.fees.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          title: input?.title || undefined,
          feeHistory: termId ? { some: { termId, deletedAt: null } } : undefined,
        },
        select: {
          id: true,
          amount: true,
          description: true,
          title: true,
          feeHistory: {
            where: { termId: termId || undefined, deletedAt: null },
            select: {
              schoolSessionId: true,
              amount: true,
              termId: true,
              id: true,
              wallet: { select: { id: true, name: true } },
              classroomDepartments: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  departmentName: true,
                  classRoom: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    }),

  deleteSchoolFeeCurrentTerm: publicProcedure
    .input(
      z.object({
        feeHistoryId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const feeHistory = await ctx.db.feeHistory.findFirstOrThrow({
        where: {
          id: input.feeHistoryId,
          termId: ctx.profile.termId,
          deletedAt: null,
          fee: {
            schoolProfileId: ctx.profile.schoolId,
          },
        },
        select: {
          id: true,
          fee: {
            select: {
              title: true,
            },
          },
        },
      });

      await ctx.db.feeHistory.update({
        where: { id: feeHistory.id },
        data: {
          deletedAt: new Date(),
          current: false,
        },
      });

      return {
        success: true,
        title: feeHistory.fee.title,
      };
    }),

  getPreviousTermFees: publicProcedure.query(async ({ ctx }) => {
    const currentTermId = ctx.profile.termId!;
    const schoolProfileId = ctx.profile.schoolId!;

    const alreadyImported = await ctx.db.feeHistory.findMany({
      where: {
        termId: currentTermId,
        deletedAt: null,
        fee: { schoolProfileId },
      },
      select: { feeId: true },
    });
    const excludedFeeIds = alreadyImported.map((f) => f.feeId);

    return ctx.db.feeHistory.findMany({
      where: {
        termId: { not: currentTermId },
        current: true,
        deletedAt: null,
        fee: { schoolProfileId, deletedAt: null },
        ...(excludedFeeIds.length ? { feeId: { notIn: excludedFeeIds } } : {}),
      },
      select: {
        id: true,
        amount: true,
        fee: { select: { id: true, title: true, description: true } },
        term: { select: { id: true, title: true } },
        wallet: { select: { id: true, name: true } },
        classroomDepartments: {
          where: { deletedAt: null },
          select: { id: true, departmentName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  importFees: publicProcedure
    .input(z.object({ feeHistoryIds: z.array(z.string()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      const currentTermId = ctx.profile.termId!;
      const schoolProfileId = ctx.profile.schoolId!;
      const term = await ctx.db.sessionTerm.findUniqueOrThrow({
        where: { id: currentTermId },
      });

      return ctx.db.$transaction(async (tx) => {
        const sources = await tx.feeHistory.findMany({
          where: {
            id: { in: input.feeHistoryIds },
            deletedAt: null,
            fee: { schoolProfileId },
          },
          select: {
            feeId: true,
            amount: true,
            walletId: true,
            classroomDepartments: { select: { id: true } },
          },
        });

        let imported = 0;
        for (const src of sources) {
          const exists = await tx.feeHistory.findFirst({
            where: { feeId: src.feeId, termId: currentTermId, deletedAt: null },
            select: { id: true },
          });
          if (exists) continue;

          await tx.feeHistory.updateMany({
            where: { feeId: src.feeId },
            data: { current: false },
          });
          await tx.feeHistory.create({
            data: {
              feeId: src.feeId,
              amount: src.amount,
              current: true,
              schoolSessionId: term.sessionId,
              termId: currentTermId,
              walletId: src.walletId,
              classroomDepartments: src.classroomDepartments.length
                ? { connect: src.classroomDepartments.map((d) => ({ id: d.id })) }
                : undefined,
            },
          });
          imported++;
        }
        return { imported };
      });
    }),

  getFeeApplyPreview: publicProcedure
    .input(z.object({ feeHistoryId: z.string() }))
    .query(async ({ input, ctx }) => {
      const currentTermId = ctx.profile.termId!;
      const schoolProfileId = ctx.profile.schoolId!;

      const feeHistory = await ctx.db.feeHistory.findFirstOrThrow({
        where: { id: input.feeHistoryId, deletedAt: null },
        select: {
          id: true,
          amount: true,
          fee: { select: { title: true } },
          classroomDepartments: {
            where: { deletedAt: null },
            select: { id: true, departmentName: true, classRoom: { select: { name: true } } },
          },
        },
      });

      const classroomFilter =
        feeHistory.classroomDepartments.length > 0
          ? { classroomDepartmentId: { in: feeHistory.classroomDepartments.map((d) => d.id) } }
          : {};

      const [eligibleForms, alreadyApplied] = await Promise.all([
        ctx.db.studentTermForm.count({
          where: {
            schoolProfileId,
            sessionTermId: currentTermId,
            deletedAt: null,
            ...classroomFilter,
          },
        }),
        ctx.db.studentFee.count({
          where: {
            feeHistoryId: input.feeHistoryId,
            deletedAt: null,
            status: { not: "cancelled" },
            studentTermForm: { sessionTermId: currentTermId },
          },
        }),
      ]);

      return {
        feeHistoryId: feeHistory.id,
        feeTitle: feeHistory.fee.title,
        amount: feeHistory.amount,
        eligibleStudents: eligibleForms,
        alreadyApplied,
        toApply: Math.max(0, eligibleForms - alreadyApplied),
        classrooms: feeHistory.classroomDepartments,
        isAllClasses: feeHistory.classroomDepartments.length === 0,
      };
    }),

  applyFeeToClass: publicProcedure
    .input(z.object({ feeHistoryId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const currentTermId = ctx.profile.termId!;
      const schoolProfileId = ctx.profile.schoolId!;

      const feeHistory = await ctx.db.feeHistory.findFirstOrThrow({
        where: { id: input.feeHistoryId, deletedAt: null },
        select: {
          id: true,
          amount: true,
          fee: { select: { title: true, description: true } },
          classroomDepartments: { where: { deletedAt: null }, select: { id: true } },
        },
      });

      const classroomFilter =
        feeHistory.classroomDepartments.length > 0
          ? { classroomDepartmentId: { in: feeHistory.classroomDepartments.map((d) => d.id) } }
          : {};

      const termForms = await ctx.db.studentTermForm.findMany({
        where: {
          schoolProfileId,
          sessionTermId: currentTermId,
          deletedAt: null,
          ...classroomFilter,
        },
        select: { id: true, studentId: true, schoolSessionId: true },
      });

      return ctx.db.$transaction(async (tx) => {
        let applied = 0;
        let skipped = 0;

        for (const form of termForms) {
          const existing = await tx.studentFee.findFirst({
            where: {
              studentTermFormId: form.id,
              feeHistoryId: input.feeHistoryId,
              deletedAt: null,
              status: { not: "cancelled" },
            },
            select: { id: true },
          });

          if (existing) {
            skipped++;
            continue;
          }

          await tx.studentFee.create({
            data: {
              billAmount: feeHistory.amount,
              pendingAmount: feeHistory.amount,
              feeTitle: feeHistory.fee.title,
              description: feeHistory.fee.description,
              feeHistoryId: input.feeHistoryId,
              schoolProfileId,
              studentTermFormId: form.id,
              schoolSessionId: form.schoolSessionId,
              studentId: form.studentId,
              status: "active",
            },
          });
          applied++;
        }

        return { applied, skipped, total: termForms.length };
      });
    }),

  getStudentFees: publicProcedure
    .input(
      z.object({ termId: z.string().optional().nullable() }).optional()
    )
    .query(async ({ input, ctx }) => {
      const termId = input?.termId || ctx.profile.termId;
      const data = await ctx.db.studentFee.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          studentTermForm: termId
            ? {
                sessionTermId: termId,
              }
            : undefined,
          deletedAt: null,
        },
        select: {
          id: true,
          billAmount: true,
          pendingAmount: true,
          updatedAt: true,
          feeTitle: true,
          description: true,
          collectionStatus: true,
          studentTermForm: {
            select: {
              sessionForm: {
                select: {
                  student: {
                    select: { name: true, otherName: true, surname: true },
                  },
                },
              },
              sessionTerm: {
                select: {
                  title: true,
                  id: true,
                  session: { select: { title: true } },
                },
              },
              student: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return data.map((d) => ({
        id: d.id,
        feeTitle: d.feeTitle,
        description: d.description,
        billAmount: d.billAmount,
        pendingAmount: d.pendingAmount,
        collectionStatus: d.collectionStatus,
        studentName:
          d.studentTermForm?.student?.name ||
          d.studentTermForm?.sessionForm?.student?.name,
      }));
    }),
});
