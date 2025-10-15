import { z } from "@hono/zod-openapi";
import { STUDENT_PAGE_STATUS_FILTERS } from "@school-clerk/utils/constants";
export const paginationSchema = z.object({
  size: z.number().nullable().optional(),
  sort: z.string().nullable().optional(),
  // start: z.number().nullable().optional(),
  cursor: z.string().nullable().optional(),
  q: z.string().nullable().optional(),
});
export const questionDataSchema = z.object({
  id: z.number().optional().nullable(),
  question: z.string().optional(),
  type: z.string().optional().nullable(),
  subject: z.string(),
  classDepartmentId: z.string(),
  className: z.string().optional(),
  subjectId: z.string().optional().nullable(),
});
export type QuestionData = z.infer<typeof questionDataSchema>;

export const questionQuerySchema = z.object({
  subjectId: z.string().optional().nullable(),
  postId: z.number().optional().nullable(),
  classDepartmentId: z.string().optional().nullable(),
});
export type QuestionQuery = z.infer<typeof questionQuerySchema>;

export const classroomQuerySchema = z.object({
  id: z.number().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  className: z.string().optional().nullable(),
  schoolSessionId: z.string().optional().nullable(),
  sessionTermId: z.string().optional().nullable(),
});
export type ClassroomQuery = z.infer<typeof classroomQuerySchema>;

export const createAcademicSessionSchema = z
  .object({
    title: z.string().optional().nullable(),
    sessionId: z.string().optional().nullable(),
    terms: z
      .array(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          title: z.string().min(1),
        })
      )
      .optional(),
  })
  .refine((data) => data.sessionId || data.title, {
    message: "Academic session title is required",
    path: ["title"],
  });
export type CreateAcademicSession = z.infer<typeof createAcademicSessionSchema>;
export const enrollmentQuerySchema = z.object({
  previousSessionId: z.string().optional().nullable(),
  previousTermId: z.string().optional().nullable(),
  currentSessionId: z.string().optional().nullable(),
  currentTermId: z.string().optional().nullable(),
  previousClassDepartmentId: z.string().optional().nullable(),
  currentClassDepartmentId: z.string().optional().nullable(),
});
export type EnrollmentQuery = z.infer<typeof enrollmentQuerySchema>;

export const getStudentsSchema = z
  .object({
    sessionId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    departmentTitles: z.array(z.string()).optional().nullable(),
    // departmentTitles: z.string().optional().nullable(),
    classroomTitle: z.string().optional().nullable(),
    sessionTermId: z.string().optional().nullable(),
    studentId: z.string().optional().nullable(),
    status: z.enum(STUDENT_PAGE_STATUS_FILTERS).optional().nullable(),
  })
  .merge(paginationSchema);
export type GetStudentsSchema = z.infer<typeof getStudentsSchema>;
export const getStudentOverviewSchema = z.object({
  studentId: z.string(),
  termSheetId: z.string().optional().nullable(),
  termId: z.string().optional().nullable(),
});
export type GetStudentOverviewSchema = z.infer<typeof getStudentOverviewSchema>;

export const getStudentTermsListSchema = z.object({
  studentId: z.string(),
});
export type GetStudentTermListSchema = z.infer<
  typeof getStudentTermsListSchema
>;

export const studentPaymentHistorySchema = z.object({
  studentId: z.string(),
  termSheetId: z.string().optional().nullable(),
});
export type StudentPaymentHistorySchema = z.infer<
  typeof studentPaymentHistorySchema
>;
export const transactionsQuerySchema = z.object({
  termId: z.string().optional().nullable(),
  termProfileId: z.string().optional().nullable(),
});
export type TransactionsQuerySchema = z.infer<typeof transactionsQuerySchema>;
export const transactionsSummarySchema = z
  .object({})
  .merge(transactionsQuerySchema);
export type TransactionsSummaryQuery = z.infer<typeof transactionsQuerySchema>;
