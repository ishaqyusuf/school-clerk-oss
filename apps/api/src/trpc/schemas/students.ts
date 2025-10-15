import { z } from "@hono/zod-openapi";
import { paginationSchema } from "./schemas";

export type __ = z.infer<typeof _>;
export const _ = z.object({});
export type GetAllSubjects = z.infer<typeof getAllSubjectsSchema>;
export const getAllSubjectsSchema = z.object({
  schoolProfileId: z.string(),
});
export type GetClassroomSubjects = z.infer<typeof getClassroomSubjectsSchema>;
export const getClassroomSubjectsSchema = z.object({
  departmentId: z.string(),
});
export const getSubjectsSchema = z
  .object({
    q: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetSubjectsSchema = z.infer<typeof getSubjectsSchema>;
