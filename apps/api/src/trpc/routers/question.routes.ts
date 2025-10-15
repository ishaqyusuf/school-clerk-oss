import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";
import { questionDataSchema, questionQuerySchema } from "../schemas/schemas";

import { loadQuestions, saveQuestion } from "@api/db/queries/questions";
export const questionsRouter = createTRPCRouter({
  all: publicProcedure
    .input(questionQuerySchema)
    .query(async ({ input, ctx }) => {
      const result = await loadQuestions(ctx, input);
      return result;
    }),
  getForm: publicProcedure
    .input(
      z.object({
        postId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await loadQuestions(ctx, input);
      return !input?.postId ? null : result?.[0];
    }),
  saveQuestion: publicProcedure
    .input(questionDataSchema)
    .mutation(async ({ input, ctx }) => {
      return saveQuestion(ctx, input);
    }),
});
