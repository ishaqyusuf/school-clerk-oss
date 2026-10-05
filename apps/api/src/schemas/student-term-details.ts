import { z } from "@hono/zod-openapi";

const recordId = z.string().trim().min(1).max(200);

export const getStudentTermDetailsSchema = z.object({
  id: recordId,
  viewScope: z.object({
    schoolId: recordId,
    userId: recordId,
    loginSessionId: recordId,
    role: z.enum(["ADMIN", "REGISTRAR"]),
    moduleRevision: z.number().int().min(0).max(2_147_483_647),
  }).optional(),
});

export type GetStudentTermDetailsInput = z.infer<typeof getStudentTermDetailsSchema>;
