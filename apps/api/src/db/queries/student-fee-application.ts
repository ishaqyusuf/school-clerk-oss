import { TRPCContext } from "../../trpc/core";
import { toMoney, toNumber } from "@school-clerk/utils";

export async function applyFeeHistoriesToStudentTermForm(
  tx: any,
  input: {
    schoolProfileId: string;
    studentId: string;
    studentTermFormId: string;
    schoolSessionId: string;
    sessionTermId: string;
    classroomDepartmentId: string;
  }
) {
  const items = await tx.financeItem.findMany({
    where: {
      schoolProfileId: input.schoolProfileId,
      isActive: true,
      applicableClasses: {
        some: { classRoomDepartmentId: input.classroomDepartmentId },
      },
    },
    include: { stream: true },
  });

  const createdCharges = [];
  for (const item of items) {
    const charge = await tx.financeCharge.create({
      data: {
        schoolProfileId: input.schoolProfileId,
        streamId: item.streamId,
        itemId: item.id,
        payerType: "STUDENT",
        studentId: input.studentId,
        studentTermFormId: input.studentTermFormId,
        classroomDepartmentId: input.classroomDepartmentId,
        schoolSessionId: input.schoolSessionId,
        sessionTermId: input.sessionTermId,
        title: item.name,
        description: item.description,
        amount: item.amount,
        collectionStatus: item.collectable ? "NOT_COLLECTED" : "NOT_REQUIRED",
      },
    });
    createdCharges.push(charge);
  }

  return {
    applied: createdCharges.length,
    skipped: 0,
    total: items.length,
    charges: createdCharges,
  };
}
