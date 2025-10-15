import type { TRPCContext } from "@api/trpc/init";
import type { StudentPaymentHistorySchema } from "@api/trpc/schemas/schemas";

export async function studentsPaymentHistory(
  ctx: TRPCContext,
  query: StudentPaymentHistorySchema
) {
  const a = await ctx.db.walletTransactions.findMany({
    where: {},
  });
}
