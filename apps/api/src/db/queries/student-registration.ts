import type { TRPCContext } from "@api/trpc/init";
import {
  applyFeeHistoriesToStudentTermForm,
  createPreparedStudentRegistration,
  prepareStudentRegistration,
  Prisma,
  StudentFeePreviewError,
  StudentRegistrationError,
} from "@school-clerk/db";
import { createStudentSchema, type CreateStudentInput } from "@school-clerk/utils/student-create-schema";
import { TRPCError } from "@trpc/server";
import { recordFinancePaymentInTransaction } from "./finance";
import { assertNoExactDuplicateStudentInClassTerm } from "./student-duplicates";

export async function createStudent(ctx: TRPCContext, input: CreateStudentInput) {
  const data = createStudentSchema.parse(input);
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer || !ctx.currentUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
  }
  const currentUser = ctx.currentUser;
  try {
    return await ctx.db.$transaction(async (tx) => {
      const prepared = await prepareStudentRegistration(tx, { schoolId, userId, bearer }, {
        schoolSessionId: ctx.profile.sessionId || null, sessionTermId: ctx.profile.termId || null,
      }, data);
      for (const sessionTermId of prepared.enrollment?.termIds ?? []) {
        await assertNoExactDuplicateStudentInClassTerm(tx, {
          schoolProfileId: prepared.schoolId, sessionTermId,
          classroomDepartmentId: prepared.enrollment?.classroomDepartmentId,
          name: data.name, surname: data.surname, otherName: data.otherName,
        });
      }
      const student = await createPreparedStudentRegistration(tx, prepared, data);
      const enrollment = prepared.enrollment;
      let feeHistoryApplication: Awaited<ReturnType<typeof applyFeeHistoriesToStudentTermForm>> | null = null;
      if (enrollment && prepared.billingEnabled) {
        const termForm = student.sessionForms.flatMap((form) => form.termForms)
          .find((form) => form.sessionTermId === enrollment.initialTermId);
        if (!termForm) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration could not create the selected enrollment." });
        feeHistoryApplication = await applyFeeHistoriesToStudentTermForm(tx, {
          schoolProfileId: prepared.schoolId, studentId: student.id, studentTermFormId: termForm.id,
          schoolSessionId: enrollment.schoolSessionId, sessionTermId: enrollment.initialTermId,
          classroomDepartmentId: enrollment.classroomDepartmentId, admissionType: data.admissionType,
          studentGender: data.gender, selectedOptionalFeeItemIds: data.selectedOptionalFeeItemIds,
        });
      }
      const chargesByFeeItemId = new Map((feeHistoryApplication?.charges ?? [])
        .filter((charge) => charge.itemId).map((charge) => [charge.itemId!, charge]));
      const paymentIds: string[] = [];
      let totalAllocated = new Prisma.Decimal(0);
      // The payment adapter uses context role checks. Supply the same live role
      // already authorized in this transaction, never an earlier profile role.
      const paymentContext = { ...ctx, currentUser: { ...currentUser, role: prepared.role } };
      for (const payment of data.feePayments.filter((entry) => entry.amount > 0)) {
        const charge = chargesByFeeItemId.get(payment.feeItemId);
        if (!charge || !enrollment) {
          throw new TRPCError({ code: "CONFLICT", message: "A selected fee no longer applies. Refresh the form before trying again." });
        }
        const result = await recordFinancePaymentInTransaction(paymentContext, tx, {
          chargeId: charge.id, amount: payment.amount, paymentDate: data.paymentDetails?.paymentDate,
          method: data.paymentDetails?.method, reference: data.paymentDetails?.reference,
          note: `Payment collected during student registration for ${charge.title}`,
          receivedById: userId, collectedTermId: enrollment.initialTermId,
          collectedSessionId: enrollment.schoolSessionId,
        });
        paymentIds.push(...result.paymentIds);
        totalAllocated = totalAllocated.plus(result.totalAllocated);
      }
      const totalAssigned = (feeHistoryApplication?.charges ?? [])
        .reduce((sum, charge) => sum.plus(charge.amount), new Prisma.Decimal(0));
      return { ...student, feeHistoryApplication, feePaymentSummary: {
        paymentIds, count: paymentIds.length, totalAssigned: Number(totalAssigned),
        totalAllocated: Number(totalAllocated), remainingBalance: Number(totalAssigned.minus(totalAllocated)),
      } };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof StudentRegistrationError || error instanceof StudentFeePreviewError) {
      throw new TRPCError({ code: error.code, message: error.message, cause: error });
    }
    if (typeof error === "object" && error !== null && "code" in error && ["P2034", "P2002"].includes(String(error.code))) {
      throw new TRPCError({ code: "CONFLICT", message: "Registration records changed or conflict with an existing record. Refresh and check the student directory before trying again.", cause: error });
    }
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration could not be completed. Check the student directory before trying again.", cause: error });
  }
}
