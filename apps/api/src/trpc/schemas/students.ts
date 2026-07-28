import { z } from "@hono/zod-openapi";
import { STUDENT_PAGE_STATUS_FILTERS } from "@school-clerk/utils/constants";
import { paginationSchema } from "./schemas";

export const studentSortFields = [
  "studentName",
  "gender",
  "dob",
  "createdAt",
] as const;

export const getStudentsSchema = z.object({
  sessionId: z.string().optional().nullable(),
  sessionTermId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  classroomDepartmentIds: z.array(z.string()).optional().nullable(),
  departmentTitles: z.array(z.string()).optional().nullable(),
  classroomTitle: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  status: z.enum(STUDENT_PAGE_STATUS_FILTERS).optional().nullable(),
  cursor: z.string().optional().nullable(),
  pageSize: z.number().min(1).max(100).optional().nullable(),
  size: z.number().min(1).max(100).optional().nullable(),
  q: z.string().trim().optional().nullable(),
  sort: z
    .tuple([z.enum(studentSortFields), z.enum(["asc", "desc"])])
    .optional()
    .nullable(),
});
export type GetStudentsSchema = z.infer<typeof getStudentsSchema>;

export type __ = z.infer<typeof _>;
export const _ = z.object({});
export type GetAllSubjects = z.infer<typeof getAllSubjectsSchema>;
export const getAllSubjectsSchema = z.object({
  schoolProfileId: z.string().optional(),
});
export type GetClassroomSubjects = z.infer<typeof getClassroomSubjectsSchema>;
export const getClassroomSubjectsSchema = z.object({
  departmentId: z.string(),
  sessionTermId: z.string(),
});
export const getSubjectsSchema = z
  .object({
    q: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    termId: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetSubjectsSchema = z.infer<typeof getSubjectsSchema>;
