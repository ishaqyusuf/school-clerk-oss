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
    .input(z.object({ studentId: z.string() }))
    .query(async (props) => {
      return getStudentAccounting(props.ctx, props.input.studentId);
    }),

  getTermFees: publicProcedure
    .input(z.object({ termId: z.string() }))
    .query(async (props) => {
      return getTermFees(props.ctx, props.input.termId);
    }),

  getSchoolFees: publicProcedure
    .input(
      z
        .object({
          termId: z.string().optional().nullable(),
          title: z.string().optional().nullable(),
          classRoomId: z.string().optional().nullable(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const termId = input?.termId || ctx.profile.termId;
      return ctx.db.fees.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          title: input?.title || undefined,
          classRoomId: input?.classRoomId !== undefined ? input.classRoomId : undefined,
          feeHistory: termId ? { some: { termId } } : undefined,
        },
        select: {
          id: true,
          amount: true,
          description: true,
          title: true,
          classRoomId: true,
          classRoom: { select: { id: true, name: true } },
          feeHistory: {
            where: { termId: termId || undefined, deletedAt: null },
            select: {
              schoolSessionId: true,
              amount: true,
              termId: true,
              id: true,
            },
          },
        },
      });
    }),

  getStudentFees: publicProcedure
    .input(z.object({ termId: z.string().optional().nullable() }).optional())
    .query(async ({ input, ctx }) => {
      const termId = input?.termId || ctx.profile.termId;
      const data = await ctx.db.studentFee.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          studentTermForm: { sessionTermId: termId! },
          deletedAt: null,
        },
        select: {
          id: true,
          billAmount: true,
          pendingAmount: true,
          updatedAt: true,
          feeTitle: true,
          description: true,
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
        studentName:
          d.studentTermForm?.student?.name ||
          d.studentTermForm?.sessionForm?.student?.name,
      }));
    }),

  // ── Student Fee Status ───────────────────────────────────────────────────────
  // Returns fee initialization state for a student's term enrollment:
  //  - notConfigured: Fees templates with no FeeHistory for this term
  //  - uninitialized: FeeHistory exists but no StudentFee for this student
  //  - initialized:   StudentFee exists
  getStudentFeeStatus: publicProcedure
    .input(z.object({ studentTermFormId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Resolve the student's classroom and term
      const termForm = await ctx.db.studentTermForm.findUniqueOrThrow({
        where: { id: input.studentTermFormId },
        select: {
          sessionTermId: true,
          studentId: true,
          classRoomDepartment: {
            select: { classRoomsId: true },
          },
        },
      });

      const termId = termForm.sessionTermId!;
      const classRoomId = termForm.classRoomDepartment?.classRoomsId;

      // All applicable fees (general + classroom-specific)
      const allFees = await ctx.db.fees.findMany({
        where: {
          schoolProfileId: ctx.profile.schoolId,
          deletedAt: null,
          OR: [
            { classRoomId: null },
            ...(classRoomId ? [{ classRoomId }] : []),
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          classRoomId: true,
          classRoom: { select: { name: true } },
          feeHistory: {
            where: { termId, deletedAt: null },
            select: { id: true, amount: true, termId: true },
            take: 1,
          },
        },
      });

      // Existing StudentFee records for this term enrollment
      const studentFees = await ctx.db.studentFee.findMany({
        where: {
          studentTermFormId: input.studentTermFormId,
          deletedAt: null,
          status: { not: "cancelled" },
        },
        select: {
          id: true,
          feeHistoryId: true,
          feeTitle: true,
          billAmount: true,
          pendingAmount: true,
          status: true,
        },
      });

      const initializedHistoryIds = new Set(
        studentFees.map((sf) => sf.feeHistoryId).filter(Boolean)
      );

      const notConfigured: typeof allFees = [];
      const uninitialized: { feeId: string; title: string; description: string | null; classRoomId: string | null; classRoomName: string | null; feeHistoryId: string; amount: number }[] = [];

      for (const fee of allFees) {
        const history = fee.feeHistory[0];
        if (!history) {
          notConfigured.push(fee);
        } else if (!initializedHistoryIds.has(history.id)) {
          uninitialized.push({
            feeId: fee.id,
            title: fee.title,
            description: fee.description,
            classRoomId: fee.classRoomId,
            classRoomName: fee.classRoom?.name ?? null,
            feeHistoryId: history.id,
            amount: history.amount,
          });
        }
      }

      return {
        termId,
        studentId: termForm.studentId,
        initialized: studentFees,
        uninitialized,
        notConfigured: notConfigured.map((f) => ({
          feeId: f.id,
          title: f.title,
          classRoomId: f.classRoomId,
          classRoomName: f.classRoom?.name ?? null,
        })),
      };
    }),

  // ── Initialize student fees (bulk) ──────────────────────────────────────────
  initializeStudentFees: publicProcedure
    .input(
      z.object({
        studentTermFormId: z.string(),
        // if omitted, initializes all uninitialized fees
        feeHistoryIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const termForm = await ctx.db.studentTermForm.findUniqueOrThrow({
        where: { id: input.studentTermFormId },
        select: {
          sessionTermId: true,
          schoolSessionId: true,
          studentId: true,
          classRoomDepartment: { select: { classRoomsId: true } },
        },
      });

      const classRoomId = termForm.classRoomDepartment?.classRoomsId;

      // Find fee histories to initialize
      const histories = await ctx.db.feeHistory.findMany({
        where: {
          id: input.feeHistoryIds ? { in: input.feeHistoryIds } : undefined,
          termId: termForm.sessionTermId!,
          deletedAt: null,
          fee: {
            schoolProfileId: ctx.profile.schoolId,
            OR: [
              { classRoomId: null },
              ...(classRoomId ? [{ classRoomId }] : []),
            ],
          },
          // Only histories not already initialized for this student
          studentFees: {
            none: {
              studentTermFormId: input.studentTermFormId,
              deletedAt: null,
            },
          },
        },
        select: {
          id: true,
          amount: true,
          fee: { select: { title: true, description: true } },
        },
      });

      if (histories.length === 0) return { created: 0 };

      await ctx.db.studentFee.createMany({
        data: histories.map((h) => ({
          billAmount: h.amount,
          pendingAmount: h.amount,
          feeHistoryId: h.id,
          feeTitle: h.fee.title,
          description: h.fee.description,
          schoolProfileId: ctx.profile.schoolId!,
          studentTermFormId: input.studentTermFormId,
          studentId: termForm.studentId!,
          status: "active",
        })),
      });

      return { created: histories.length };
    }),

  // ── Bulk initialize all students in a classroom ──────────────────────────────
  bulkInitializeClassFees: publicProcedure
    .input(
      z.object({
        classRoomDepartmentId: z.string(),
        termId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const termId = input.termId || ctx.profile.termId!;

      const department = await ctx.db.classRoomDepartment.findUniqueOrThrow({
        where: { id: input.classRoomDepartmentId },
        select: { classRoomsId: true },
      });
      const classRoomId = department.classRoomsId;

      // All StudentTermForms in this classroom for this term
      const termForms = await ctx.db.studentTermForm.findMany({
        where: {
          classRoomDepartmentId: input.classRoomDepartmentId,
          sessionTermId: termId,
          deletedAt: null,
        },
        select: { id: true, studentId: true },
      });

      if (termForms.length === 0) return { created: 0 };

      // Applicable FeeHistory for this term
      const histories = await ctx.db.feeHistory.findMany({
        where: {
          termId,
          deletedAt: null,
          fee: {
            schoolProfileId: ctx.profile.schoolId,
            OR: [
              { classRoomId: null },
              ...(classRoomId ? [{ classRoomId }] : []),
            ],
          },
        },
        select: {
          id: true,
          amount: true,
          fee: { select: { title: true, description: true } },
        },
      });

      if (histories.length === 0) return { created: 0 };

      let created = 0;
      for (const tf of termForms) {
        // Check which histories are already initialized for this student
        const existing = await ctx.db.studentFee.findMany({
          where: {
            studentTermFormId: tf.id,
            feeHistoryId: { in: histories.map((h) => h.id) },
            deletedAt: null,
          },
          select: { feeHistoryId: true },
        });
        const existingIds = new Set(existing.map((e) => e.feeHistoryId));
        const toCreate = histories.filter((h) => !existingIds.has(h.id));
        if (toCreate.length > 0) {
          await ctx.db.studentFee.createMany({
            data: toCreate.map((h) => ({
              billAmount: h.amount,
              pendingAmount: h.amount,
              feeHistoryId: h.id,
              feeTitle: h.fee.title,
              description: h.fee.description,
              schoolProfileId: ctx.profile.schoolId!,
              studentTermFormId: tf.id,
              studentId: tf.studentId!,
              status: "active",
            })),
          });
          created += toCreate.length;
        }
      }

      return { created };
    }),

  // ── Term fee setup ───────────────────────────────────────────────────────────
  // Returns all fee templates for the school, grouped with their configuration
  // status for the given term (whether a FeeHistory record exists).
  getTermFeeSetup: publicProcedure
    .input(z.object({ termId: z.string() }))
    .query(async ({ input, ctx }) => {
      const term = await ctx.db.sessionTerm.findUniqueOrThrow({
        where: { id: input.termId },
        select: { sessionId: true },
      });

      // Find last term for reference amounts
      const prevTerm = await ctx.db.sessionTerm.findFirst({
        where: {
          schoolId: ctx.profile.schoolId,
          sessionId: term.sessionId,
          id: { not: input.termId },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      const fees = await ctx.db.fees.findMany({
        where: { schoolProfileId: ctx.profile.schoolId, deletedAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          classRoomId: true,
          classRoom: { select: { id: true, name: true } },
          feeHistory: {
            where: { deletedAt: null },
            select: { id: true, amount: true, termId: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { title: "asc" },
      });

      return fees.map((fee) => {
        const currentHistory = fee.feeHistory.find(
          (h) => h.termId === input.termId
        );
        const lastHistory =
          prevTerm
            ? fee.feeHistory.find((h) => h.termId === prevTerm.id)
            : fee.feeHistory[0];
        return {
          feeId: fee.id,
          title: fee.title,
          description: fee.description,
          classRoomId: fee.classRoomId,
          classRoomName: fee.classRoom?.name ?? null,
          configured: !!currentHistory,
          currentHistoryId: currentHistory?.id ?? null,
          currentAmount: currentHistory?.amount ?? null,
          lastTermAmount: lastHistory?.amount ?? null,
        };
      });
    }),

  // Bulk upsert FeeHistory records for a term (from term fee setup form)
  saveTermFeeSetup: publicProcedure
    .input(
      z.object({
        termId: z.string(),
        fees: z.array(
          z.object({
            feeId: z.string(),
            amount: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const term = await ctx.db.sessionTerm.findUniqueOrThrow({
        where: { id: input.termId },
        select: { sessionId: true },
      });

      await ctx.db.$transaction(async (tx) => {
        for (const item of input.fees) {
          // Mark previous histories for this fee+term as not current
          await tx.feeHistory.updateMany({
            where: { feeId: item.feeId, termId: input.termId },
            data: { current: false },
          });
          await tx.feeHistory.create({
            data: {
              feeId: item.feeId,
              amount: item.amount,
              current: true,
              schoolSessionId: term.sessionId,
              termId: input.termId,
            },
          });
        }
      });

      return { saved: input.fees.length };
    }),

  // ── All-term accounting for a student (payment portal) ──────────────────────
  getStudentAllTermsAccounting: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const termForms = await ctx.db.studentTermForm.findMany({
        where: {
          studentId: input.studentId,
          deletedAt: null,
        },
        select: {
          id: true,
          sessionTermId: true,
          sessionTerm: {
            select: {
              id: true,
              title: true,
              session: { select: { id: true, title: true } },
            },
          },
          classRoomDepartment: {
            select: { classRoomsId: true, departmentName: true },
          },
          studentFees: {
            where: { deletedAt: null, status: { not: "cancelled" } },
            select: {
              id: true,
              feeTitle: true,
              billAmount: true,
              pendingAmount: true,
              feeHistoryId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return termForms.map((tf) => {
        const totalInvoiced = tf.studentFees.reduce(
          (s, f) => s + f.billAmount,
          0
        );
        const totalPending = tf.studentFees.reduce(
          (s, f) => s + f.pendingAmount,
          0
        );
        return {
          studentTermFormId: tf.id,
          termId: tf.sessionTermId,
          termTitle: tf.sessionTerm?.title,
          sessionTitle: tf.sessionTerm?.session?.title,
          sessionId: tf.sessionTerm?.session?.id,
          classRoomDepartmentId: tf.classRoomDepartment?.classRoomsId,
          className: tf.classRoomDepartment?.departmentName,
          totalInvoiced,
          totalPaid: totalInvoiced - totalPending,
          totalPending,
          fees: tf.studentFees,
          isCurrentTerm: tf.sessionTermId === ctx.profile.termId,
        };
      });
    }),

  // ── Student search (payment portal) ─────────────────────────────────────────
  searchStudents: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const students = await ctx.db.students.findMany({
        where: {
          deletedAt: null,
          studentSessionForms: {
            some: {
              schoolSession: { schoolId: ctx.profile.schoolId },
            },
          },
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { surname: { contains: input.query, mode: "insensitive" } },
            { otherName: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          surname: true,
          otherName: true,
          studentFees: {
            where: { deletedAt: null, status: { not: "cancelled" } },
            select: { pendingAmount: true },
          },
          studentTermForms: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              classRoomDepartment: {
                select: { departmentName: true, classRoom: { select: { name: true } } },
              },
            },
          },
        },
        take: 20,
      });

      return students.map((s) => ({
        id: s.id,
        name: [s.name, s.otherName, s.surname].filter(Boolean).join(" "),
        currentClass:
          s.studentTermForms[0]?.classRoomDepartment
            ? `${s.studentTermForms[0].classRoomDepartment.classRoom?.name ?? ""} ${s.studentTermForms[0].classRoomDepartment.departmentName ?? ""}`.trim()
            : null,
        currentTermFormId: s.studentTermForms[0]?.id ?? null,
        totalOutstanding: s.studentFees.reduce(
          (sum, f) => sum + f.pendingAmount,
          0
        ),
      }));
    }),
});
