import {
  deleteClassSubject,
  deleteClassSubjectSchema,
  formData,
  formDataSchema,
  getAllSubjects,
  getClassroomSubjects,
  getQuickAddSubjects,
  getQuickAddSubjectsSchema,
  getSubjects,
  overview,
  saveSubject,
  saveSubjectSchema,
  subjectOverviewSchema,
} from "../../db/queries/subjects";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  getAllSubjectsSchema,
  getClassroomSubjectsSchema,
  getSubjectsSchema,
} from "../schemas/students";
export const subjectsRouter = createTRPCRouter({
  getSubjects: publicProcedure.input(getSubjectsSchema).query(async (props) => {
    return getSubjects(props.ctx, props.input);
  }),
  all: publicProcedure.input(getAllSubjectsSchema).query(async (q) => {
    return await getAllSubjects(q.ctx, q.input);
  }),
  byClassroom: publicProcedure
    .input(getClassroomSubjectsSchema)
    .query(async ({ input, ctx: { db } }) => {
      // console.log(input);

      // return [];
      return await getClassroomSubjects(db, input);
    }),
  deleteClassSubject: publicProcedure
    .input(deleteClassSubjectSchema)
    .mutation(async (props) => {
      return deleteClassSubject(props.ctx, props.input);
    }),
  getQuickAddSubjects: publicProcedure
    .input(getQuickAddSubjectsSchema)
    .query(async (props) => {
      return getQuickAddSubjects(props.ctx, props.input);
    }),
  saveSubject: publicProcedure
    .input(saveSubjectSchema)
    .mutation(async (props) => {
      return saveSubject(props.ctx, props.input);
    }),
  overview: publicProcedure
    .input(subjectOverviewSchema)
    .query(async (props) => {
      return overview(props.ctx, props.input);
    }),
  formData: publicProcedure.input(formDataSchema).query(async (props) => {
    return formData(props.ctx, props.input);
  }),
});
