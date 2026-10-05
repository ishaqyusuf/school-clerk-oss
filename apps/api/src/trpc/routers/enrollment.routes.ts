import {
  createTRPCRouter,
  moduleProcedure,
} from "../init";
import { enrollmentQuerySchema } from "../schemas/schemas";
import { enrollmentsIndex } from "@api/db/queries/enrollment-query";
const admissionProcedure = moduleProcedure(["ADMISSION_ENROLLMENT"]);

export const enrollmentsRouter = createTRPCRouter({
  index: admissionProcedure
    .input(enrollmentQuerySchema)
    .query(async ({ input, ctx }) => {
      const result = enrollmentsIndex(ctx, input);
      return result;
    }),
});
