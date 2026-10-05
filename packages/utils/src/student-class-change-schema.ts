import { z } from "zod";
import { deleteStudentSchema } from "./student-delete-schema";

const recordId = z.string().trim().min(1).max(200);
export const changeStudentClassSchema = z.object({
  studentTermFormId: recordId,
  classroomDepartmentId: recordId,
  viewScope: deleteStudentSchema.shape.viewScope,
});
export const bulkChangeStudentClassSchema = z.object({
  studentTermFormIds: z.array(recordId).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, {
    message: "Select each term enrollment only once.",
  }),
  classroomDepartmentId: recordId,
  viewScope: deleteStudentSchema.shape.viewScope,
});
export type ChangeStudentClassInput = z.infer<typeof changeStudentClassSchema>;
export type BulkChangeStudentClassInput = z.infer<typeof bulkChangeStudentClassSchema>;
export const studentClassChangeOptionsSchema = bulkChangeStudentClassSchema.pick({ studentTermFormIds: true, viewScope: true });
export type StudentClassChangeOptionsInput = z.infer<typeof studentClassChangeOptionsSchema>;
