import type { Prisma } from "./generated/client";

type WorkspaceDatabase = Pick<Prisma.TransactionClient, "session" | "schoolProfile">;
export type WorkspaceSelection = { schoolId?: string; sessionId?: string; termId?: string };

function currentDatedTerm<T extends { startDate: Date | null; endDate: Date | null }>(terms: T[]) {
  const now = new Date();
  const started = terms.filter((term) => term.startDate && term.startDate <= now)
    .sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));
  return started.find((term) => term.endDate && term.endDate >= now) ??
    started.find((term) => !term.endDate);
}

// Cookies select preferences; only stored auth and account/school ancestry
// establish a workspace. No platform-role exception grants school membership.
export async function resolveTenantWorkspace(db: WorkspaceDatabase, input: {
  token: string; userId: string; tenantSlug: string;
  selection?: WorkspaceSelection; strictSelection?: boolean;
}) {
  if (!input.token || input.token.length > 512 || !input.userId || input.userId.length > 200 ||
    !input.tenantSlug || input.tenantSlug.length > 253) return null;
  const authentication = await db.session.findFirst({ where: {
    token: input.token, userId: input.userId, deletedAt: null, expiresAt: { gt: new Date() },
    user: { deletedAt: null, tenant: { deletedAt: null, qaPurgeStartedAt: null } },
  }, select: { id: true, user: { select: { saasAccountId: true } } } });
  const accountId = authentication?.user.saasAccountId;
  if (!authentication || !accountId) return null;
  const candidates = await db.schoolProfile.findMany({ where: {
    subDomain: input.tenantSlug, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null },
  }, select: { id: true, accountId: true }, take: 2 });
  const candidate = candidates[0];
  if (candidates.length !== 1 || !candidate || candidate.accountId !== accountId) return null;
  const school = await db.schoolProfile.findFirst({ where: {
    id: candidate.id, subDomain: input.tenantSlug, accountId, deletedAt: null,
    account: { deletedAt: null, qaPurgeStartedAt: null,
      users: { some: { id: input.userId, deletedAt: null, sessions: { some: {
        id: authentication.id, token: input.token, deletedAt: null, expiresAt: { gt: new Date() },
      } } } } },
  }, select: { id: true, subDomain: true, activeSessionTermId: true, sessions: {
    where: { deletedAt: null }, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true, title: true, terms: {
      where: { deletedAt: null, schoolId: candidate.id },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: { id: true, title: true, sessionId: true, startDate: true, endDate: true },
    } },
  } } });
  if (!school) return null;

  const requested = input.selection;
  const selection = requested?.schoolId && requested.schoolId !== school.id ? undefined : requested;
  if (input.strictSelection && (!selection || (!selection.sessionId && !selection.termId))) return null;
  const selectedSession = school.sessions.find((session) => session.id === selection?.sessionId);
  const terms = school.sessions.flatMap((session) => session.terms);
  const selectedTerm = terms.find((term) => term.id === selection?.termId);
  const mismatchedPair = selection?.sessionId && selectedTerm && selectedTerm.sessionId !== selection.sessionId;
  if (input.strictSelection && ((selection?.sessionId && !selectedSession) ||
    (selection?.termId && !selectedTerm) || mismatchedPair)) return null;
  const usableTerm = mismatchedPair ? undefined : selectedTerm;
  const activeTerm = !selectedSession && !usableTerm
    ? terms.find((term) => term.id === school.activeSessionTermId) : undefined;
  const preferredTerm = usableTerm ?? activeTerm;
  const session = school.sessions.find((item) => item.id === preferredTerm?.sessionId) ??
    selectedSession ?? school.sessions[0];
  const term = preferredTerm ?? currentDatedTerm(session?.terms ?? []) ?? session?.terms[0];
  return { schoolId: school.id, domain: school.subDomain,
    sessionId: session?.id, sessionTitle: session?.title,
    termId: term?.id, termTitle: term?.title };
}
