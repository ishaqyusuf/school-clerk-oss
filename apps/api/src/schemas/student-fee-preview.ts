import { z } from "@hono/zod-openapi";

export const previewApplicableFeeHistoriesSchema = z.object({
  sessionTermId: z.string().min(1).max(200),
  classroomDepartmentId: z.string().min(1).max(200).optional().nullable(),
  admissionType: z.enum(["UNCLASSIFIED", "NEW_ADMISSION", "RETURNING"]),
  studentGender: z.enum(["Male", "Female"]),
  viewScope: z.object({
    schoolId: z.string().min(1).max(200),
    userId: z.string().min(1).max(200),
    loginSessionId: z.string().min(1).max(200),
  }).optional(),
});

export type PreviewApplicableFeeHistoriesInput = z.infer<typeof previewApplicableFeeHistoriesSchema>;
