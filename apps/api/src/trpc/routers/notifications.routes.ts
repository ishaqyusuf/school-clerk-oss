import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { notificationListSchema, notificationReadSchema, notificationScopeSchema } from "../../schemas/notifications";
import {
  countUnreadSchoolNotifications, getNotificationFeedContactId, getSchoolModuleConfiguration,
  listSchoolNotifications, markAllSchoolNotificationsRead, markSchoolNotificationRead,
} from "@school-clerk/db";
import { getReadableSchoolNotificationTypes, getSchoolNotificationAccessKey } from "@school-clerk/notifications/module-policy";
import { resolveModuleAccess } from "@school-clerk/utils/module-config";
import { getCurrentUserContext } from "../../lib/notifications";
import { authenticatedProcedure, createTRPCRouter, type TRPCContext } from "../init";

async function getFeedScope(ctx: TRPCContext, expected: z.infer<typeof notificationScopeSchema>) {
  const current = await getCurrentUserContext(ctx);
  const schoolId = current.school.id;
  const userId = current.user.id;
  if (expected.schoolId !== schoolId || expected.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Notification workspace changed. Reload the page." });
  }
  const [school, contactId] = await Promise.all([
    getSchoolModuleConfiguration(ctx.db, { schoolId, accountId: current.school.accountId }),
    getNotificationFeedContactId(ctx.db, { schoolId, userId }),
  ]);
  if (!school) throw new TRPCError({ code: "FORBIDDEN", message: "Notification school is unavailable." });
  const access = resolveModuleAccess(school.moduleConfiguration);
  const allowedTypes = getReadableSchoolNotificationTypes(access, current.user.role);
  if (expected.accessKey !== getSchoolNotificationAccessKey(access, current.user.role)) {
    throw new TRPCError({ code: "CONFLICT", message: "Notification access changed. Reload the page." });
  }
  return {
    schoolId, userId, contactId,
    allowedTypes,
  };
}

export const notificationsRouter = createTRPCRouter({
  list: authenticatedProcedure
    .input(notificationListSchema)
    .query(async ({ ctx, input }) => listSchoolNotifications(ctx.db, await getFeedScope(ctx, input), {
      onlyUnread: notificationListSchema.shape.onlyUnread.parse(input.onlyUnread),
      take: notificationListSchema.shape.take.parse(input.take),
    })),

  unreadCount: authenticatedProcedure.input(notificationScopeSchema).query(async ({ ctx, input }) =>
    countUnreadSchoolNotifications(ctx.db, await getFeedScope(ctx, input))),

  markRead: authenticatedProcedure
    .input(notificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await markSchoolNotificationRead(ctx.db, await getFeedScope(ctx, input), input.notificationId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found." });
      return result;
    }),

  markAllRead: authenticatedProcedure.input(notificationScopeSchema).mutation(async ({ ctx, input }) =>
    markAllSchoolNotificationsRead(ctx.db, await getFeedScope(ctx, input))),
});
