import { classroomFilters, subjectFilters } from "@api/db/queries/filters";
import { createTRPCRouter, publicProcedure } from "../init";
import { enrollmentQuerySchema } from "../schemas/schemas";
import { enrollmentsIndex } from "@api/db/queries/enrollment-query";
export const filtersRoutes = createTRPCRouter({
  subject: publicProcedure.query(async (props) => {
    return subjectFilters(props.ctx);
  }),
  classroom: publicProcedure.query(async (props) => {
    return classroomFilters(props.ctx);
  }),
});
