import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";
import { classroomQuerySchema, questionQuerySchema } from "../schemas/schemas";

import { loadQuestions } from "@api/db/queries/questions";
import {
  getClassroomOverview,
  getClassroomOverviewSchema,
  getClassrooms,
} from "@api/db/queries/classroom";
export const classroomRouter = createTRPCRouter({
  all: publicProcedure
    .input(classroomQuerySchema)
    .query(async ({ input, ctx }) => {
      if (!input.schoolSessionId) input.schoolSessionId = ctx.profile.sessionId;
      const result = await getClassrooms(ctx, input);
      return result;
    }),

  getClassroomOverview: publicProcedure
    .input(getClassroomOverviewSchema)
    .query(async (props) => {
      return getClassroomOverview(props.ctx, props.input);
    }),
  getClassroomsForSession: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return getClassrooms(ctx, {
        schoolSessionId: input,
      });
    }),
  getCurrentSessionClassroom: publicProcedure.query(async ({ input, ctx }) => {
    return getClassrooms(ctx, {
      schoolSessionId: ctx.profile.sessionId,
    });
  }),
  getForm: publicProcedure
    .input(
      z.object({
        postId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await loadQuestions(ctx, input);
      return result?.[0];
    }),
  test: publicProcedure.query(async ({ input, ctx: { db } }) => {
    return {
      id: 1,
    };
  }),
});
