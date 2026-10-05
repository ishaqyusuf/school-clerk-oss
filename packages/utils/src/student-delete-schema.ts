import { z } from "zod";

const recordId = z.string().trim().min(1).max(200);

export const deleteStudentSchema = z.object({
  studentId: recordId,
  viewScope: z.object({
    schoolId: recordId,
    userId: recordId,
    loginSessionId: recordId,
  }).optional(),
});

export type DeleteStudentInput = z.infer<typeof deleteStudentSchema>;

export const deleteTermSheetSchema = z.object({
  id: recordId,
  viewScope: deleteStudentSchema.shape.viewScope,
});

export const bulkDeleteTermSheetsSchema = z.object({
  ids: z.array(recordId).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, {
    message: "Select each term record only once.",
  }),
  viewScope: deleteStudentSchema.shape.viewScope,
});

export type DeleteTermSheetInput = z.infer<typeof deleteTermSheetSchema>;
export type BulkDeleteTermSheetsInput = z.infer<typeof bulkDeleteTermSheetsSchema>;
