import { z } from "@hono/zod-openapi";

export const searchScopeSchema = z.object({
  schoolId: z.string().min(1).max(200),
  userId: z.string().min(1).max(200),
  loginSessionId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(200).nullable(),
});

export const globalSearchSchema = searchScopeSchema.extend({
  accessKey: z.string().min(1).max(4096),
  limit: z.number().int().min(1).max(20).default(8),
  query: z.string().trim().max(100).default(""),
});
