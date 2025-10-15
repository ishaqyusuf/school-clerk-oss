import { createTRPCRouter, publicProcedure } from "../init";
import { enrollmentQuerySchema } from "../schemas/schemas";
import { enrollmentsIndex } from "@api/db/queries/enrollment-query";
export const enrollmentsRouter = createTRPCRouter({
  index: publicProcedure
    .input(enrollmentQuerySchema)
    .query(async ({ input, ctx }) => {
      const result = enrollmentsIndex(ctx, input);
      return result;
    }),
});
