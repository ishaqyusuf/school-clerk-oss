import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

const createStaffSchema = z.object({
  title: z.string(),
  name: z.string().min(0),
  email: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
});

const deleteStaffSchema = z.object({
  staffId: z.string(),
  termProfileId: z.string().optional(),
});

export const staffRouter = createTRPCRouter({
  getStaffList: publicProcedure
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const { schoolId, sessionId, termId } = ctx.profile;
      const staff = await ctx.db.staffProfile.findMany({
        where: {
          schoolProfileId: schoolId,
          deletedAt: null,
          name: input?.q ? { contains: input.q, mode: "insensitive" } : undefined,
        },
        select: {
          id: true,
          name: true,
          title: true,
          termProfiles: {
            where: {
              deletedAt: null,
              schoolSessionId: sessionId,
              sessionTermId: termId,
            },
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
      });
      return staff.map(({ termProfiles, ...s }) => ({
        ...s,
        staffSessionId: termProfiles?.[0]?.id,
        staffTermId: termProfiles?.[0]?.id,
      }));
    }),

  createStaff: publicProcedure
    .input(createStaffSchema)
    .mutation(async ({ input, ctx }) => {
      const { schoolId, sessionId, termId } = ctx.profile;
      return ctx.db.staffProfile.create({
        data: {
          title: input.title,
          name: input.name,
          email: input.email,
          schoolProfileId: schoolId!,
          termProfiles: {
            create: {
              schoolSessionId: sessionId!,
              sessionTermId: termId!,
            },
          },
        },
      });
    }),

  deleteStaff: publicProcedure
    .input(deleteStaffSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.staffProfile.update({
        where: { id: input.staffId },
        data: {
          deletedAt: input.termProfileId ? undefined : new Date(),
          termProfiles: {
            updateMany: {
              where: {
                id: input.termProfileId ? input.termProfileId : undefined,
              },
              data: { deletedAt: new Date() },
            },
          },
        },
      });
      return { success: true };
    }),
});
