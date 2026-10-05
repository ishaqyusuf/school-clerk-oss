import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";
import type { Database } from "./prisma";

export type NotificationFeedScope = {
  schoolId: string;
  userId: string;
  contactId: string | null;
  allowedTypes: string[];
};

const unreadRecipientWhere: Prisma.NotificationRecipientWhereInput = {
  OR: [{ status: "unread" }, { status: null }],
};

function recipientWhere(scope: NotificationFeedScope): Prisma.NotificationRecipientWhereInput {
  return {
    deletedAt: null,
    ...(scope.contactId ? { recipientContactId: scope.contactId } : { id: { in: [] } }),
    recipientContact: { schoolProfileId: scope.schoolId, userId: scope.userId, deletedAt: null },
  };
}

function feedWhere(scope: NotificationFeedScope, onlyUnread = false): Prisma.NotificationWhereInput {
  const recipient = recipientWhere(scope);
  return {
    schoolProfileId: scope.schoolId, deletedAt: null, type: { in: scope.allowedTypes },
    OR: [
      { userId: scope.userId, recipients: { none: recipient }, ...(onlyUnread ? { isRead: false } : {}) },
      { recipients: { some: { ...recipient, ...(onlyUnread ? unreadRecipientWhere : {}) } } },
    ],
  };
}

export async function getNotificationFeedContactId(db: Pick<DatabaseTransaction, "notificationContact">, scope: {
  schoolId: string; userId: string;
}) {
  const contact = await db.notificationContact.findFirst({
    where: { schoolProfileId: scope.schoolId, userId: scope.userId, role: "user", deletedAt: null },
    select: { id: true },
  });
  return contact?.id ?? null;
}

export async function listSchoolNotifications(db: Pick<DatabaseTransaction, "notification">, scope: NotificationFeedScope,
  input: { onlyUnread: boolean; take: number }) {
  const rows = await db.notification.findMany({
    where: feedWhere(scope, input.onlyUnread),
    include: { recipients: { where: recipientWhere(scope), select: { status: true } } },
    orderBy: { createdAt: "desc" }, take: input.take,
  });
  return rows.map(({ recipients, ...row }) => ({
    ...row, isRead: recipients[0] ? recipients[0].status != null && recipients[0].status !== "unread" : row.isRead,
  }));
}

export function countUnreadSchoolNotifications(db: Pick<DatabaseTransaction, "notification">, scope: NotificationFeedScope) {
  return db.notification.count({ where: feedWhere(scope, true) });
}

export async function markSchoolNotificationRead(db: Database, scope: NotificationFeedScope, notificationId: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.notification.findFirst({
      where: { ...feedWhere(scope), id: notificationId },
      select: { id: true, recipients: { where: recipientWhere(scope), select: { id: true } } },
    });
    if (!row) return null;
    const result = row.recipients[0]
      ? await tx.notificationRecipient.updateMany({
          where: { ...recipientWhere(scope), id: row.recipients[0].id,
            notification: { ...feedWhere(scope), id: row.id } },
          data: { status: "read", readAt: new Date() },
        })
      : await tx.notification.updateMany({
          where: { ...feedWhere(scope), id: row.id, userId: scope.userId },
          data: { isRead: true },
        });
    return result.count === 1 ? { id: row.id, isRead: true } : null;
  });
}

export function markAllSchoolNotificationsRead(db: Database, scope: NotificationFeedScope) {
  return db.$transaction(async (tx) => {
    const notifications = await tx.notification.updateMany({
      where: { ...feedWhere(scope, true), userId: scope.userId, recipients: { none: recipientWhere(scope) } },
      data: { isRead: true },
    });
    const recipients = await tx.notificationRecipient.updateMany({
      where: { ...recipientWhere(scope), ...unreadRecipientWhere, notification: feedWhere(scope) },
      data: { status: "read", readAt: new Date() },
    });
    return { notifications, recipients };
  });
}
