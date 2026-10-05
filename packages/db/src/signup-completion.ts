import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";
import { ensureNotificationContact } from "./notification-contacts";

export type SignupCompletionScope = { schoolId: string; accountId: string; userId: string };
type CompletionDatabase = Pick<DatabaseTransaction, "user" | "schoolProfile" | "notificationPreference" | "notification" | "notificationContact">;

export async function getSignupCompletionContext(db: CompletionDatabase, scope: SignupCompletionScope) {
  const school = await db.schoolProfile.findFirst({ where: {
    id: scope.schoolId, accountId: scope.accountId, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null },
  }, select: { id: true, name: true, subDomain: true, account: { select: { email: true } } } });
  if (!school) return null;
  const users = await db.user.findMany({ where: { deletedAt: {},
    email: { equals: school.account.email, mode: "insensitive" } }, take: 2,
    select: { id: true, name: true, email: true, role: true, deletedAt: true, saasAccountId: true } });
  const owner = users[0];
  if (users.length !== 1 || !owner || owner.id !== scope.userId || owner.deletedAt ||
    owner.saasAccountId !== scope.accountId || owner.role?.toLowerCase() !== "admin" ||
    owner.email !== school.account.email || owner.email !== owner.email.trim().toLowerCase()) return null;
  const preference = await db.notificationPreference.findFirst({ where: {
    schoolProfileId: school.id, userId: owner.id, type: "signup_success", deletedAt: null,
  }, select: { email: true, inApp: true } });
  return { school, owner, preference };
}

export async function createSignupCompletionNotification(db: CompletionDatabase, scope: SignupCompletionScope,
  input: { schoolName: string; title: string; body: string | null; link?: string | null; action?: Prisma.NotificationUncheckedCreateInput["action"] }) {
  const context = await getSignupCompletionContext(db, scope);
  if (!context || context.school.name !== input.schoolName || context.preference?.inApp === false) return null;
  const recipient = await ensureNotificationContact(db, { displayName: context.owner.name,
    role: "user", schoolProfileId: scope.schoolId, userId: scope.userId });
  return db.notification.create({ data: {
    action: input.action ?? undefined, body: input.body, content: input.body,
    headline: input.title, title: input.title, subject: input.title,
    type: "signup_success", link: input.link, schoolProfileId: scope.schoolId, userId: scope.userId,
    recipients: { create: { recipientContactId: recipient.id } },
  }, select: { id: true } });
}
