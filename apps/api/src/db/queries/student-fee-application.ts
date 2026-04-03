import type { TRPCContext } from "@api/trpc/init";

type DBLike = TRPCContext["db"];

type ApplyFeeHistoriesToStudentTermFormInput = {
  schoolProfileId: string;
  studentId: string;
  studentTermFormId: string;
  schoolSessionId: string;
  sessionTermId: string;
  classroomDepartmentId?: string | null;
};

export async function applyFeeHistoriesToStudentTermForm(
  db: DBLike,
  input: ApplyFeeHistoriesToStudentTermFormInput
) {
  const feeHistories = await db.feeHistory.findMany({
    where: {
      termId: input.sessionTermId,
      current: true,
      deletedAt: null,
      OR: [
        { classroomDepartments: { none: {} } },
        ...(input.classroomDepartmentId
          ? [
              {
                classroomDepartments: {
                  some: {
                    id: input.classroomDepartmentId,
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      amount: true,
      fee: {
        select: {
          title: true,
          description: true,
        },
      },
    },
  });

  let applied = 0;
  let skipped = 0;

  for (const feeHistory of feeHistories) {
    const existing = await db.studentFee.findFirst({
      where: {
        studentTermFormId: input.studentTermFormId,
        feeHistoryId: feeHistory.id,
        deletedAt: null,
        status: { not: "cancelled" },
      },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.studentFee.create({
      data: {
        billAmount: feeHistory.amount,
        pendingAmount: feeHistory.amount,
        feeTitle: feeHistory.fee.title,
        description: feeHistory.fee.description,
        feeHistoryId: feeHistory.id,
        schoolProfileId: input.schoolProfileId,
        studentTermFormId: input.studentTermFormId,
        schoolSessionId: input.schoolSessionId,
        studentId: input.studentId,
        status: "active",
      },
    });

    applied++;
  }

  return {
    applied,
    skipped,
    total: feeHistories.length,
  };
}
