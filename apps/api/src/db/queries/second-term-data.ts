import type { TRPCContext } from "@api/trpc/init";

import { z } from "zod";

export const getSecondTermAccountingSchema = z.object({});
export type GetSecondTermAccountingSchema = z.infer<
  typeof getSecondTermAccountingSchema
>;
const postCode = `second-term`;
export async function getSecondTermAccounting(
  ctx: TRPCContext,
  data: GetSecondTermAccountingSchema
) {}
