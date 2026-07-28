import { authenticatedProcedure, createTRPCRouter } from "../init";
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
  changeStudentClassSchema,
  changeStudentClass,
  bulkDeleteTermSheetsSchema,
  bulkDeleteTermSheets,
  bulkChangeStudentClassSchema,
  bulkChangeStudentClass,
  setStudentAdmissionTypeSchema,
  setStudentAdmissionType,
  bulkSetStudentAdmissionTypeSchema,
  bulkSetStudentAdmissionType,
  changeStudentGenderSchema,
  changeStudentGender,
  verifyStudentImportSchema,
  verifyStudentImport,
  executeStudentImportSchema,
  executeStudentImport,
  startStudentImportJobSchema,
  startStudentImportJob,
  getStudentImportJobSchema,
  getStudentImportJob,
  getImportNameGuide,
} from "../../db/queries/students";
import {
  studentDuplicateScopeSchema,
  getStudentDuplicateGroups,
  studentDuplicateMergePreviewSchema,
  previewStudentDuplicateMerge,
  mergeStudentDuplicates,
} from "../../db/queries/student-duplicates";
import { getStudentOverviewSchema } from "../schemas/schemas";
import { getStudentsSchema } from "../schemas/students";
import { studentsOverview } from "@api/db/queries/students.overview";
import { getStudentTermsList } from "@api/db/queries/academic-terms";
import { TRPCError } from "@trpc/server";
export const studentsRouter = createTRPCRouter({
  filters: authenticatedProcedure.query(async ({ input, ctx }) => {
    return getStudentsQueryParams(ctx);
  }),
  index: authenticatedProcedure
    .input(getStudentsSchema)
    .query(async ({ input, ctx }) => {
      return getStudents(ctx, input);
    }),
  getStudent: authenticatedProcedure
    .input(getStudentsSchema)
    .query(async ({ input, ctx }) => {
      return getStudent(ctx, input);
    }),
  createStudent: authenticatedProcedure
    .input(createStudentSchema)
    .mutation(async (props) => {
      return createStudent(props.ctx, props.input);
    }),
  deleteStudent: authenticatedProcedure
    .input(deleteStudentSchema)
    .mutation(async (props) => {
      return deleteStudent(props.ctx, props.input);
    }),
  deleteTermSheet: authenticatedProcedure
    .input(deleteTermSheetSchema)
    .mutation(async (props) => {
      return deleteTermSheet(props.ctx, props.input);
    }),
  changeStudentClass: authenticatedProcedure
    .input(changeStudentClassSchema)
    .mutation(async (props) => {
      return changeStudentClass(props.ctx, props.input);
    }),
  bulkDeleteTermSheets: authenticatedProcedure
    .input(bulkDeleteTermSheetsSchema)
    .mutation(async (props) => {
      return bulkDeleteTermSheets(props.ctx, props.input);
    }),
  bulkChangeClass: authenticatedProcedure
    .input(bulkChangeStudentClassSchema)
    .mutation(async (props) => {
      return bulkChangeStudentClass(props.ctx, props.input);
    }),
  setAdmissionType: authenticatedProcedure
    .input(setStudentAdmissionTypeSchema)
    .mutation((props) => setStudentAdmissionType(props.ctx, props.input)),
  bulkSetAdmissionType: authenticatedProcedure
    .input(bulkSetStudentAdmissionTypeSchema)
    .mutation((props) => bulkSetStudentAdmissionType(props.ctx, props.input)),
  updateStudentBasicProfile: authenticatedProcedure
    .input(updateStudentBasicProfileSchema)
    .mutation(async (props) => {
      return updateStudentBasicProfile(props.ctx, props.input);
    }),
  changeGender: authenticatedProcedure
    .input(changeStudentGenderSchema)
    .mutation(async (props) => {
      return changeStudentGender(props.ctx, props.input);
    }),
  executeStudentImport: authenticatedProcedure
    .input(executeStudentImportSchema)
    .mutation(async (props) => {
      return executeStudentImport(props.ctx, props.input);
    }),
  startStudentImportJob: authenticatedProcedure
    .input(startStudentImportJobSchema)
    .mutation(async (props) => {
      return startStudentImportJob(props.ctx, props.input);
    }),
  getStudentImportJob: authenticatedProcedure
    .input(getStudentImportJobSchema)
    .query(async (props) => {
      return getStudentImportJob(props.ctx, props.input);
    }),
  analytics: authenticatedProcedure
    .input(studentsAnalyticsSchema)
    .query(async (props) => {
      return studentsAnalytics(props.ctx, props.input);
    }),
  duplicateGroups: authenticatedProcedure
    .input(studentDuplicateScopeSchema)
    .query(async (props) => {
      return getStudentDuplicateGroups(props.ctx, props.input);
    }),
  previewDuplicateMerge: authenticatedProcedure
    .input(studentDuplicateMergePreviewSchema)
    .query(async (props) => {
      return previewStudentDuplicateMerge(props.ctx, props.input);
    }),
  mergeDuplicates: authenticatedProcedure
    .input(studentDuplicateMergePreviewSchema)
    .mutation(async (props) => {
      return mergeStudentDuplicates(props.ctx, props.input);
    }),
  academicsOverview: authenticatedProcedure
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
  overview: authenticatedProcedure
    .input(getStudentOverviewSchema)
    .query(async (props) => {
      return studentsOverview(props.ctx, props.input);
    }),
  getStudentPaymentHistory: authenticatedProcedure.query(
    async ({ ctx, input }) => {
      // return getStudentPaymentHistory(ctx, input);
    },
  ),
  studentsRecentRecord: authenticatedProcedure
    .input(studentsRecentRecordSchema)
    .query(async (props) => {
      return studentsRecentRecord(props.ctx, props.input);
    }),
  getImportNameGuide: authenticatedProcedure.query(async (props) => {
    return getImportNameGuide(props.ctx);
  }),
  verifyStudentImport: authenticatedProcedure
    .input(verifyStudentImportSchema)
    .query(async (props) => {
      return verifyStudentImport(props.ctx, props.input);
    }),
  verifyStudentImportBatch: authenticatedProcedure
    .input(verifyStudentImportSchema)
    .mutation(async (props) => {
      return verifyStudentImport(props.ctx, props.input);
    }),
  getTermFormDetails: authenticatedProcedure
    .input(deleteTermSheetSchema) // reuse { id: string }
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const schoolProfileId = ctx.profile.schoolId;
      if (!schoolProfileId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A school workspace is required.",
        });
      }
      const form = await db.studentTermForm.findFirst({
        where: {
          id: input.id,
          schoolProfileId,
          deletedAt: null,
          student: {
            schoolProfileId,
            deletedAt: null,
          },
        },
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
