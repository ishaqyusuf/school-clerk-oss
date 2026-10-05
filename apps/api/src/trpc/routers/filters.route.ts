import { classroomFilters, subjectFilters } from "@api/db/queries/filters";
import { createTRPCRouter, moduleProcedure } from "../init";
export const filtersRoutes = createTRPCRouter({
  subject: moduleProcedure(["COURSES_SUBJECTS"]).query(async (props) => {
    return subjectFilters(props.ctx);
  }),
  classroom: moduleProcedure(["ACADEMIC_PROGRAMS"]).query(async (props) => {
    return classroomFilters(props.ctx);
  }),
});
