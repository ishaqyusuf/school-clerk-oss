import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  createPost,
  findStudents,
  generateFirstTermData,
  getClassroomPrintData,
  getClassrooms,
  getClassroomStudentList,
  getClassroomStudents,
  getClassroomSubjects,
  getPaymentsList,
  getStudentAssessments,
  getStudentsPrintdata,
  getSubjects,
  getUniqueueAssessmentList,
  updatePost,
  updateStudentAssessment,
} from "@api/db/queries/first-term-data";

export const ftdRouter = createTRPCRouter({
  studentSearch: publicProcedure
    .input(
      z.object({
        searchParts: z.array(z.string()),
      })
    )
    .query(async (props) => {
      return findStudents(props.ctx, props.input.searchParts);
    }),
  generateFirstTermData: publicProcedure
    .input(
      z.object({
        payload: z.any(),
      })
    )
    .mutation(async (props) => {
      return generateFirstTermData(props.ctx, props.input.payload);
    }),
  studentPrintData: publicProcedure
    .input(
      z.object({
        studentIds: z.array(z.number()),
      })
    )
    .query(async (props) => {
      return getStudentsPrintdata(props.ctx, props.input.studentIds);
    }),
  classRooms: publicProcedure.query(async (props) => {
    return getClassrooms(props.ctx);
  }),
  getUniqueueAssessmentList: publicProcedure.query(async (props) => {
    return getUniqueueAssessmentList(props.ctx);
  }),
  subjectsList: publicProcedure.query(async (props) => {
    return getSubjects(props.ctx);
  }),
  getPaymentsList: publicProcedure.query(async (props) => {
    return getPaymentsList(props.ctx);
  }),
  getClassroomPrintData: publicProcedure
    .input(
      z.object({
        classRoomId: z.number(),
      })
    )
    .query(async (props) => {
      return getClassroomPrintData(props.ctx, props.input.classRoomId);
    }),
  getClassroomStudents: publicProcedure
    .input(
      z.object({
        classRoomId: z.number(),
      })
    )
    .query(async (props) => {
      return getClassroomStudents(props.ctx, props.input.classRoomId);
    }),
  getClassroomStudentList: publicProcedure
    .input(
      z.object({
        classRoomId: z.number(),
      })
    )
    .query(async (props) => {
      return getClassroomStudentList(props.ctx, props.input.classRoomId);
    }),
  getStudentAssessments: publicProcedure
    .input(
      z.object({
        studentId: z.number(),
        subjectAssessments: z.array(z.any()),
      })
    )
    .query(async (props) => {
      return getStudentAssessments(props.ctx, props.input);
    }),
  getClassRoomSubjects: publicProcedure
    .input(
      z.object({
        classRoomId: z.number(),
      })
    )
    .query(async (props) => {
      return getClassroomSubjects(props.ctx, props.input.classRoomId);
    }),
  updateStudentAssessment: publicProcedure
    .input(
      z.object({
        meta: z.object({
          studentId: z.number(),
          subjectAssessmentId: z.number(),
          classSubjectId: z.number(),
          classId: z.number(),
          markObtained: z.number().optional().nullable(),
          calculatedScore: z.number().optional().nullable(),
        }),
      })
    )
    .mutation(async (props) => {
      return await updateStudentAssessment(props.ctx, props.input);
    }),
  createPost: publicProcedure
    .input(
      z.object({
        data: z.any(),
        // id: z.number(),
      })
    )
    .mutation(async (props) => {
      if (Array.isArray(props.input.data)) {
        const result = await Promise.all(
          props.input.data.map((item) => createPost(props.ctx, item))
        );
        return result;
      }
      return await createPost(props.ctx, props.input.data);
    }),
  deletePost: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async (props) => {
      await props.ctx.db.posts.delete({
        where: {
          id: props.input.id,
        },
      });
    }),
  updatePost: publicProcedure
    .input(
      z.object({
        data: z.any(),
        id: z.number(),
      })
    )
    .mutation(async (props) => {
      return await updatePost(props.ctx, props.input.id, props.input.data);
    }),
});
