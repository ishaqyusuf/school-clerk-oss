import { getLiveAuthSessionRecords, getPasswordSignInIdentity, prisma } from "@school-clerk/db";
import type { AuthContext } from "better-auth";
import { APIError } from "better-auth/api";

type InternalAdapter = AuthContext["internalAdapter"];
type PasswordIdentity = NonNullable<Awaited<ReturnType<typeof getPasswordSignInIdentity>>>;
type SessionRecord = { id: string; userId: string; token: string };

// Match the existing platformAdminProcedure policy; never infer this authority
// from a school Admin role or request body.
function platformRoles() {
  return (process.env.SCHOOL_CLERK_PLATFORM_ADMIN_ROLES ?? "PLATFORM_ADMIN,SUPER_ADMIN")
    .split(",").map((role) => role.trim().toUpperCase()).filter(Boolean);
}

export function loadPasswordSignInIdentity(email: string) {
  return getPasswordSignInIdentity(prisma, email, { platformRoles: platformRoles() });
}

async function liveSessionMap(sessions: SessionRecord[]) {
  const records = sessions.length
    ? await getLiveAuthSessionRecords(prisma, sessions.map((session) => session.id), { platformRoles: platformRoles() }) : [];
  const candidates = new Map(sessions.map((session) => [session.id, session]));
  return new Map(records.filter((record) => {
    const candidate = candidates.get(record.id);
    return candidate && record.userId === candidate.userId && record.token === candidate.token;
  }).map((record) => [record.id, record]));
}

// Install on the per-request context, not plugin init: Better Auth rebuilds its
// internal adapter after initializing plugins. Nested session middleware uses
// this same request adapter.
export function withLiveAuthSessions(adapter: InternalAdapter): InternalAdapter {
  return {
    ...adapter,
    async findSession(token) {
      const result = await adapter.findSession(token);
      if (!result) return null;
      const live = (await liveSessionMap([result.session])).get(result.session.id);
      if (!live?.expiresAt) return null;
      return { ...result, session: { ...result.session, expiresAt: live.expiresAt },
        user: { ...result.user, ...live.user, emailVerified: live.user.emailVerified === true } };
    },
    async findSessions(tokens, options) {
      const results = await adapter.findSessions(tokens, options);
      const live = await liveSessionMap(results.map((result) => result.session));
      return results.flatMap((result) => {
        const current = live.get(result.session.id);
        return current?.expiresAt ? [{ ...result, session: { ...result.session, expiresAt: current.expiresAt },
          user: { ...result.user, ...current.user,
          emailVerified: current.user.emailVerified === true } }] : [];
      });
    },
    async listSessions(userId, options) {
      const results = await adapter.listSessions(userId, options);
      const live = await liveSessionMap(results);
      return results.flatMap((session) => {
        const current = live.get(session.id);
        return current?.expiresAt ? [{ ...session, expiresAt: current.expiresAt }] : [];
      });
    },
  };
}

function samePasswordIdentity(expected: PasswordIdentity, current: PasswordIdentity | null) {
  return current !== null && current.user.id === expected.user.id &&
    current.user.email === expected.user.email && current.user.name === expected.user.name &&
    current.user.role === expected.user.role && current.user.emailVerified === expected.user.emailVerified &&
    current.user.saasAccountId === expected.user.saasAccountId &&
    current.credential.id === expected.credential.id && current.credential.password === expected.credential.password;
}

export function withPasswordSignInIdentity(adapter: InternalAdapter, identity: PasswordIdentity): InternalAdapter {
  return {
    ...adapter,
    async findUserByEmail(email, options) {
      if (email !== identity.user.email) return null;
      const result = await adapter.findUserByEmail(email, options);
      const credentials = result?.accounts.filter((account) => account.providerId === "credential") ?? [];
      const credential = credentials[0];
      if (!result || result.user.id !== identity.user.id || result.user.email !== identity.user.email ||
        result.user.name !== identity.user.name || !("role" in result.user) || result.user.role !== identity.user.role ||
        (result.user.emailVerified === true) !== (identity.user.emailVerified === true) ||
        credentials.length !== 1 || !credential || credential.id !== identity.credential.id ||
        credential.accountId !== identity.user.id || credential.userId !== identity.user.id ||
        credential.password !== identity.credential.password) return null;
      return result;
    },
    async createSession(userId, dontRememberMe, override, overrideAll) {
      if (userId !== identity.user.id || !samePasswordIdentity(identity,
        await loadPasswordSignInIdentity(identity.user.email))) {
        throw new APIError("UNAUTHORIZED", { message: "Invalid email or password.", code: "INVALID_EMAIL_OR_PASSWORD" });
      }
      const session = await adapter.createSession(userId, dontRememberMe, override, overrideAll);
      if (!session) throw new APIError("UNAUTHORIZED", { message: "Unable to establish a session." });
      try {
        if (samePasswordIdentity(identity, await loadPasswordSignInIdentity(identity.user.email)) &&
          (await liveSessionMap([session])).has(session.id)) return session;
      } catch {
        // An unavailable recheck must not issue cookies for the new session.
      }
      await adapter.deleteSession(session.token);
      throw new APIError("UNAUTHORIZED", { message: "Invalid email or password.", code: "INVALID_EMAIL_OR_PASSWORD" });
    },
  };
}
