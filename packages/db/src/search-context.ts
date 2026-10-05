import type { Prisma } from "./generated/client";

export type SearchIdentity = {
  schoolId: string; userId: string; loginSessionId: string; sessionId: string | null;
};

export async function getSearchContext(db: Pick<Prisma.TransactionClient, "session" | "schoolProfile" | "schoolSession">,
  input: SearchIdentity & { bearer: string }) {
  const login = await db.session.findFirst({ where: {
    id: input.loginSessionId, userId: input.userId, deletedAt: null, expiresAt: { gt: new Date() },
    OR: [{ token: input.bearer }, { id: input.bearer }],
    user: { deletedAt: null, tenant: { deletedAt: null, qaPurgeStartedAt: null } },
  }, select: { user: { select: { id: true, role: true, saasAccountId: true } } } });
  if (!login?.user.saasAccountId) return null;
  const school = await db.schoolProfile.findFirst({ where: {
    id: input.schoolId, accountId: login.user.saasAccountId, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null },
  }, select: { id: true, moduleConfiguration: { select: {
    version: true, revision: true, enabledModules: true, entitledModules: true,
  } } } });
  if (!school) return null;
  if (input.sessionId && !await db.schoolSession.findFirst({ where: {
    id: input.sessionId, schoolId: school.id, deletedAt: null,
  }, select: { id: true } })) return null;
  return { user: login.user, school };
}
