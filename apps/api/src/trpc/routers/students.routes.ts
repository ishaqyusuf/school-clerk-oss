import { createTRPCRouter, publicProcedure } from "../init";
import {
  getStudents,
  getStudent,
  getStudentsQueryParams,
  createStudentSchema,
  createStudent,
} from "../../db/queries/students";
import {
  getStudentOverviewSchema,
  getStudentsSchema,
} from "../schemas/schemas";
import { studentsOverview } from "@api/db/queries/students.overview";
import { getStudentTermsList } from "@api/db/queries/academic-terms";
export const studentsRouter = createTRPCRouter({
  filters: publicProcedure.query(async ({ input, ctx }) => {
    return getStudentsQueryParams(ctx);
  }),
  index: publicProcedure
    .input(getStudentsSchema)
    .query(async ({ input, ctx }) => {
      return getStudents(ctx, input);
    }),
  getStudent: publicProcedure
    .input(getStudentsSchema)
    .query(async ({ input, ctx }) => {
      return getStudent(ctx, input);
    }),
  createStudent: publicProcedure
    .input(createStudentSchema)
    .mutation(async (props) => {
      return createStudent(props.ctx, props.input);
    }),
  academicsOverview: publicProcedure
    .input(getStudentOverviewSchema)
    .query(async ({ ctx, input }) => {
      // if (!input.termSheetId) return null;

      const student = await getStudent(ctx, { studentId: input.studentId });
      const termHistory = await getStudentTermsList(ctx, {
        studentId: input.studentId,
      });
      const term = termHistory.find((t) => t.termId === input.termId);

      return {
        id: null,
        termHistory,
        student,
        term,
      };
    }),
  overview: publicProcedure
    .input(getStudentOverviewSchema)
    .query(async (props) => {
      return studentsOverview(props.ctx, props.input);
    }),
  getStudentPaymentHistory: publicProcedure.query(async ({ ctx, input }) => {
    // return getStudentPaymentHistory(ctx, input);
  }),
});
