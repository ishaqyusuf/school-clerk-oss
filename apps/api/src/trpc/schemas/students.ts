import { z } from "@hono/zod-openapi";
import {
  STUDENT_PAGE_STATUS_FILTERS,
  STUDENT_TERM_ADMISSION_TYPES,
  daysFilters,
} from "@school-clerk/utils/constants";
import { paginationSchema } from "./schemas";

export const studentSortFields = [
  "studentName",
  "gender",
  "dob",
  "createdAt",
] as const;

function isIsoCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

const enrollmentDateSchema = z
  .array(z.string())
  .min(1)
  .max(2)
  .superRefine((values, ctx) => {
    if (values.length === 1) {
      const [value] = values;
      if (
        value &&
        (daysFilters.includes(value as (typeof daysFilters)[number]) ||
          isIsoCalendarDate(value))
      ) {
        return;
      }
    }

    const [from, to] = values;
    if (
      from &&
      to &&
      values.length === 2 &&
      values.every(isIsoCalendarDate) &&
      from <= to
    ) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Enrollment date must be a supported preset or ordered date range.",
    });
  });

export const getStudentsSchema = z.object({
  sessionId: z.string().optional().nullable(),
  sessionTermId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  classroomDepartmentIds: z.array(z.string()).optional().nullable(),
  departmentTitles: z.array(z.string()).optional().nullable(),
  classroomTitle: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  status: z.enum(STUDENT_PAGE_STATUS_FILTERS).optional().nullable(),
  admissionTypes: z
    .array(z.enum(STUDENT_TERM_ADMISSION_TYPES))
    .optional()
    .nullable(),
  enrollmentDate: enrollmentDateSchema.optional().nullable(),
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
