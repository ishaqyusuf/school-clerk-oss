import { authenticatedProcedure, createTRPCRouter, publicProcedure } from "../init";
import {
  getStudents,
  getStudent,
  getStudentsQueryParams,
  createStudentSchema,
  createStudent,
  studentsRecentRecordSchema,
  studentsRecentRecord,
  studentsAnalyticsSchema,
  studentsAnalytics,
  updateStudentBasicProfileSchema,
  updateStudentBasicProfile,
  deleteStudentSchema,
  deleteStudent,
  deleteTermSheetSchema,
  deleteTermSheet,
  bulkDeleteTermSheetsSchema,
  bulkDeleteTermSheets,
  changeStudentGenderSchema,
  changeStudentGender,
  verifyStudentImportSchema,
  verifyStudentImport,
  executeStudentImportSchema,
  executeStudentImport,
  getImportNameGuide,
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
  deleteStudent: publicProcedure
    .input(deleteStudentSchema)
    .mutation(async (props) => {
      return deleteStudent(props.ctx, props.input);
    }),
  deleteTermSheet: publicProcedure
    .input(deleteTermSheetSchema)
    .mutation(async (props) => {
      return deleteTermSheet(props.ctx, props.input);
    }),
  bulkDeleteTermSheets: publicProcedure
    .input(bulkDeleteTermSheetsSchema)
    .mutation(async (props) => {
      return bulkDeleteTermSheets(props.ctx, props.input);
    }),
  updateStudentBasicProfile: publicProcedure
    .input(updateStudentBasicProfileSchema)
    .mutation(async (props) => {
      return updateStudentBasicProfile(props.ctx, props.input);
    }),
  changeGender: authenticatedProcedure
    .input(changeStudentGenderSchema)
    .mutation(async (props) => {
      return changeStudentGender(props.ctx, props.input);
    }),
  executeStudentImport: publicProcedure
    .input(executeStudentImportSchema)
    .mutation(async (props) => {
      return executeStudentImport(props.ctx, props.input);
    }),
  analytics: publicProcedure
    .input(studentsAnalyticsSchema)
    .query(async (props) => {
      return studentsAnalytics(props.ctx, props.input);
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
  studentsRecentRecord: publicProcedure
    .input(studentsRecentRecordSchema)
    .query(async (props) => {
      return studentsRecentRecord(props.ctx, props.input);
    }),
  getImportNameGuide: publicProcedure.query(async (props) => {
    return getImportNameGuide(props.ctx);
  }),
  verifyStudentImport: publicProcedure
    .input(verifyStudentImportSchema)
    .query(async (props) => {
      return verifyStudentImport(props.ctx, props.input);
    }),
  verifyStudentImportBatch: publicProcedure
    .input(verifyStudentImportSchema)
    .mutation(async (props) => {
      return verifyStudentImport(props.ctx, props.input);
    }),
  getTermFormDetails: publicProcedure
    .input(deleteTermSheetSchema) // reuse { id: string }
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const form = await db.studentTermForm.findUnique({
        where: { id: input.id },
        include: {
          student: { select: { name: true, surname: true, otherName: true } },
          classroomDepartment: { select: { departmentName: true } },
          sessionTerm: { select: { title: true } },
          assessmentRecords: {
            select: {
              id: true,
              obtained: true,
              classSubjectAssessment: {
                select: {
                  title: true,
                  departmentSubject: {
                    select: { subject: { select: { title: true } } },
                  },
                },
              },
            },
          },
          attendanceList: {
            select: { id: true, isPresent: true, createdAt: true },
          },
        },
      });
      if (!form) return null;
      return {
        id: form.id,
        student: form.student,
        classroom: form.classroomDepartment?.departmentName ?? null,
        term: form.sessionTerm?.title ?? null,
        counts: {
          assessmentRecords: form.assessmentRecords.filter(
            (r) => r.obtained !== null,
          ).length,
          studentFees: 0,
          payments: 0,
          attendance: form.attendanceList.length,
        },
        assessmentRecords: form.assessmentRecords
          .filter((r) => r.obtained !== null)
          .map((r) => ({
            id: r.id,
            obtained: r.obtained,
            assessmentTitle: r.classSubjectAssessment?.title ?? null,
            subjectTitle:
              r.classSubjectAssessment?.departmentSubject?.subject?.title ??
              null,
          })),
        studentFees: [],
        payments: [],
        attendance: form.attendanceList.map((a) => ({
          id: a.id,
          status: a.isPresent ? "PRESENT" : "ABSENT",
          date: a.createdAt,
        })),
      };
    }),
});
