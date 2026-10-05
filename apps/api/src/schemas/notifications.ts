import { z } from "@hono/zod-openapi";

export const notificationScopeSchema = z.object({
  schoolId: z.string().min(1),
  userId: z.string().min(1),
  accessKey: z.string().min(1).max(2000),
});

export const notificationListSchema = notificationScopeSchema.extend({
  onlyUnread: z.boolean().default(false),
  take: z.number().int().min(1).max(100).default(50),
});

export const notificationReadSchema = notificationScopeSchema.extend({
  notificationId: z.string().min(1),
});
