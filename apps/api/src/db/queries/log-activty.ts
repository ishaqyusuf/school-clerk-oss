import { getAuth } from "@api/auth-utils";
import type { TRPCContext } from "@api/trpc/init";
import type { ActivitySource, ActivityType } from "@school-clerk/db";
import { z } from "zod";

export const createActivitySchema = z.object({
  source: z.string().optional().nullable(),
  // source: z.nativeEnum(ActivitySource).optional().nullable(),
  type: z.string(),
  // type: z.nativeEnum(ActivityType),
  description: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  meta: z.record(z.any()),
});
export type CreateActivity = z.infer<typeof createActivitySchema>;
export async function createActivity(ctx: TRPCContext, data: CreateActivity) {
  const auth = await getAuth(ctx);
  await ctx.db.activity.create({
    data: {
      ...data,
      userId: auth.id,
      author: auth.name,
      source: (data.source as any) ?? "system",
      type: data.type as any,
    },
  });
}
