import {
  createTRPCRouter,
  moduleProcedure,
} from "../init";
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
  getStudentImportReference,
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
import { studentsOverview, studentAcademicsOverview } from "@api/db/queries/students.overview";
import { getStudentTermDetailsSchema } from "@api/schemas/student-term-details";
import { readStudentTermDetails } from "@api/db/queries/student-term-details";
import { readStudentClassChangeOptions } from "@api/db/queries/student-class-change";
import { studentClassChangeOptionsSchema } from "@school-clerk/utils/student-class-change-schema";
import { z } from "zod";
import {
  submitClassStudentSchema,
  submitClassStudent,
  listClassStudentRequests,
  getClassStudentMatches,
  reviewClassStudentSchema,
  reviewClassStudent,
} from "../../db/queries/teacher-student-requests";
const studentProcedure = moduleProcedure(["STUDENT_MANAGEMENT"]);
const studentAcademicProcedure = moduleProcedure(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"], { roles: ["Admin", "Registrar"] });
const studentAdmissionProcedure = moduleProcedure(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS", "BILLING_FINANCE"], { roles: ["Admin", "Registrar"] });

export const studentsRouter = createTRPCRouter({
  submitClassStudent: moduleProcedure(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"], { roles: ["Teacher", "Admin", "Registrar"] })
    .input(submitClassStudentSchema)
    .mutation(({ ctx, input }) => submitClassStudent(ctx, input)),
  classStudentRequests: moduleProcedure(["STUDENT_MANAGEMENT"], { roles: ["Admin", "Registrar"] })
    .query(({ ctx }) => listClassStudentRequests(ctx)),
  classStudentMatches: moduleProcedure(["STUDENT_MANAGEMENT"], { roles: ["Admin", "Registrar"] })
    .input(z.object({ studentTermFormId: z.string().min(1) }))
    .query(({ ctx, input }) => getClassStudentMatches(ctx, input.studentTermFormId)),
  reviewClassStudent: moduleProcedure(["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"], { roles: ["Admin", "Registrar"] })
    .input(reviewClassStudentSchema)
    .mutation(({ ctx, input }) => reviewClassStudent(ctx, input)),
  filters: studentProcedure.query(async ({ input, ctx }) => {
    return getStudentsQueryParams(ctx);
  }),
  index: studentProcedure
    .input(getStudentsSchema)
    .query(async ({ input, ctx }) => {
      return getStudents(ctx, input);
    }),
  getStudent: studentProcedure
    .input(getStudentsSchema)
    .query(async ({ input, ctx }) => {
      return getStudent(ctx, input);
    }),
  createStudent: moduleProcedure(["STUDENT_MANAGEMENT"], { roles: ["Admin", "Registrar"] })
    .input(createStudentSchema)
    .mutation(async (props) => {
      return createStudent(props.ctx, props.input);
    }),
  deleteStudent: moduleProcedure(["STUDENT_MANAGEMENT"], { roles: ["Admin", "Registrar"] })
    .input(deleteStudentSchema)
    .mutation(async (props) => {
      return deleteStudent(props.ctx, props.input);
    }),
  deleteTermSheet: studentAcademicProcedure
    .input(deleteTermSheetSchema)
    .mutation(async (props) => {
      return deleteTermSheet(props.ctx, props.input);
    }),
  classChangeOptions: studentAcademicProcedure
    .input(studentClassChangeOptionsSchema)
    .query(({ ctx, input }) => readStudentClassChangeOptions(ctx, input)),
  changeStudentClass: studentAcademicProcedure
    .input(changeStudentClassSchema)
    .mutation(async (props) => {
      return changeStudentClass(props.ctx, props.input);
    }),
  bulkDeleteTermSheets: studentAcademicProcedure
    .input(bulkDeleteTermSheetsSchema)
    .mutation(async (props) => {
      return bulkDeleteTermSheets(props.ctx, props.input);
    }),
  bulkChangeClass: studentAcademicProcedure
    .input(bulkChangeStudentClassSchema)
    .mutation(async (props) => {
      return bulkChangeStudentClass(props.ctx, props.input);
    }),
  setAdmissionType: studentAdmissionProcedure
    .input(setStudentAdmissionTypeSchema)
    .mutation((props) => setStudentAdmissionType(props.ctx, props.input)),
  bulkSetAdmissionType: studentAdmissionProcedure
    .input(bulkSetStudentAdmissionTypeSchema)
    .mutation((props) => bulkSetStudentAdmissionType(props.ctx, props.input)),
  updateStudentBasicProfile: moduleProcedure(["STUDENT_MANAGEMENT"], { roles: ["Admin", "Registrar"] })
    .input(updateStudentBasicProfileSchema)
    .mutation(async (props) => {
      return updateStudentBasicProfile(props.ctx, props.input);
    }),
  changeGender: moduleProcedure(["STUDENT_MANAGEMENT"], { roles: ["Admin", "Registrar"] })
    .input(changeStudentGenderSchema)
    .mutation(async (props) => {
      return changeStudentGender(props.ctx, props.input);
    }),
  executeStudentImport: studentAdmissionProcedure
    .input(executeStudentImportSchema)
    .mutation(async (props) => {
      return executeStudentImport(props.ctx, props.input);
    }),
  startStudentImportJob: studentAdmissionProcedure
    .input(startStudentImportJobSchema)
    .mutation(async (props) => {
      return startStudentImportJob(props.ctx, props.input);
    }),
  getStudentImportJob: studentAdmissionProcedure
    .input(getStudentImportJobSchema)
    .query(async (props) => {
      return getStudentImportJob(props.ctx, props.input);
    }),
  analytics: studentProcedure
    .input(studentsAnalyticsSchema)
    .query(async (props) => {
      return studentsAnalytics(props.ctx, props.input);
    }),
  duplicateGroups: studentProcedure
    .input(studentDuplicateScopeSchema)
    .query(async (props) => {
      return getStudentDuplicateGroups(props.ctx, props.input);
    }),
  previewDuplicateMerge: studentProcedure
    .input(studentDuplicateMergePreviewSchema)
    .query(async (props) => {
      return previewStudentDuplicateMerge(props.ctx, props.input);
    }),
  mergeDuplicates: studentProcedure
    .input(studentDuplicateMergePreviewSchema)
    .mutation(async (props) => {
      return mergeStudentDuplicates(props.ctx, props.input);
    }),
  academicsOverview: studentAcademicProcedure
    .input(getStudentOverviewSchema)
    .query(async ({ ctx, input }) => {
      return studentAcademicsOverview(ctx, input);
    }),
  overview: studentAcademicProcedure
    .input(getStudentOverviewSchema)
    .query(async (props) => {
      return studentsOverview(props.ctx, props.input);
    }),
  getStudentPaymentHistory: studentProcedure.query(
    async ({ ctx, input }) => {
      // return getStudentPaymentHistory(ctx, input);
    },
  ),
  studentsRecentRecord: studentProcedure
    .input(studentsRecentRecordSchema)
    .query(async (props) => {
      return studentsRecentRecord(props.ctx, props.input);
    }),
  getStudentImportReference: studentAdmissionProcedure.query(({ ctx }) => getStudentImportReference(ctx)),
  getImportNameGuide: studentAdmissionProcedure.query(async (props) => {
    return getImportNameGuide(props.ctx);
  }),
  verifyStudentImport: studentAdmissionProcedure
    .input(verifyStudentImportSchema)
    .query(async (props) => {
      return verifyStudentImport(props.ctx, props.input);
    }),
  verifyStudentImportBatch: studentAdmissionProcedure
    .input(verifyStudentImportSchema)
    .mutation(async (props) => {
      return verifyStudentImport(props.ctx, props.input);
    }),
  getTermFormDetails: studentAcademicProcedure
    .input(getStudentTermDetailsSchema)
    .query(({ ctx, input }) => readStudentTermDetails(ctx, input)),
});
