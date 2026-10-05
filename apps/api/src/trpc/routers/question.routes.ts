import { z } from "@hono/zod-openapi";
import {
  createTRPCRouter,
  moduleProcedure,
} from "../init";
import { questionDataSchema, questionQuerySchema } from "../schemas/schemas";

import { loadQuestions, saveQuestion } from "@api/db/queries/questions";
const questionProcedure = moduleProcedure(["ASSESSMENT_AND_EXAMS"]);

export const questionsRouter = createTRPCRouter({
  all: questionProcedure
    .input(questionQuerySchema)
    .query(async ({ input, ctx }) => {
      const result = await loadQuestions(ctx, input);
      return result;
    }),
  getForm: questionProcedure
    .input(
      z.object({
        postId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await loadQuestions(ctx, input);
      return !input?.postId ? null : result?.[0];
    }),
  saveQuestion: questionProcedure
    .input(questionDataSchema)
    .mutation(async ({ input, ctx }) => {
      return saveQuestion(ctx, input);
    }),
});
