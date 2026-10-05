import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";
import { ensureNotificationContact } from "./notification-contacts";

export type NotificationDeliveryScope = {
  schoolId: string;
  accountId: string;
  actorUserId: string;
  authSessionId: string;
  recipientUserId: string;
  type: string;
  audienceRoles?: readonly string[];
};

type DeliveryDatabase = Pick<DatabaseTransaction,
  "schoolProfile" | "session" | "user" | "notificationPreference">;

export function listNotificationAudienceUserIds(db: Pick<DatabaseTransaction, "user">, input: {
  accountId: string; roles: readonly string[];
}) {
  return db.user.findMany({
    where: { saasAccountId: input.accountId, role: { in: [...input.roles] }, deletedAt: null },
    select: { id: true }, orderBy: { createdAt: "asc" },
  });
}

export async function getNotificationDeliveryRecipient(db: DeliveryDatabase, scope: NotificationDeliveryScope) {
  const [school, session, recipient] = await Promise.all([
    db.schoolProfile.findFirst({
      where: { id: scope.schoolId, accountId: scope.accountId, deletedAt: null,
        account: { deletedAt: null, qaPurgeStartedAt: null } },
      select: { id: true, accountId: true, name: true, subDomain: true,
        moduleConfiguration: { select: { version: true, revision: true, enabledModules: true, entitledModules: true } } },
    }),
    db.session.findFirst({
      where: { userId: scope.actorUserId, deletedAt: null, expiresAt: { gt: new Date() },
        OR: [{ id: scope.authSessionId }, { token: scope.authSessionId }],
        user: { deletedAt: null, saasAccountId: scope.accountId } },
      select: { user: { select: { id: true, name: true, role: true } } },
    }),
    db.user.findFirst({
      where: { id: scope.recipientUserId, saasAccountId: scope.accountId, deletedAt: null,
        ...(scope.audienceRoles ? { role: { in: [...scope.audienceRoles] } } : {}) },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);
  if (!school || !session || !recipient) return null;
  const preference = await db.notificationPreference.findFirst({
    where: { schoolProfileId: school.id, userId: recipient.id, type: scope.type, deletedAt: null },
    select: { inApp: true, email: true },
  });
  return { school, actor: session.user, recipient, preference };
}

export async function createDeliveredUserNotification(
  db: Pick<DatabaseTransaction, "notification" | "notificationContact">,
  context: NonNullable<Awaited<ReturnType<typeof getNotificationDeliveryRecipient>>>,
  input: Pick<Prisma.NotificationUncheckedCreateInput, "action" | "body" | "link" | "subject" | "title" | "type"> & {
    tags?: { tagName: string; tagValue: string }[];
  },
) {
  const author = await ensureNotificationContact(db, {
    role: "user", schoolProfileId: context.school.id, userId: context.actor.id, displayName: context.actor.name,
  });
  const recipient = await ensureNotificationContact(db, {
    role: "user", schoolProfileId: context.school.id, userId: context.recipient.id, displayName: context.recipient.name,
  });
  return db.notification.create({
    data: {
      ...input,
      authorContactId: author.id, schoolProfileId: context.school.id, userId: context.recipient.id,
      content: input.body, headline: input.title,
      tags: { create: [{ tagName: "notification_type", tagValue: input.type }, ...(input.tags ?? [])] },
      recipients: { create: { recipientContactId: recipient.id } },
    },
    select: { id: true },
  });
}
