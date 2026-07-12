"use server";
import { prisma } from "@school-clerk/db";
import {
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
} from "@school-clerk/tenant-url";
import { auth } from "@/auth/server";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import { cookies, headers } from "next/headers";

export interface AuthCookie {
  domain: string;
  sessionId?: string;
  schoolId?: string;
  termId?: string;
  sessionTitle?: string;
  termTitle?: string;
  auth: {
    bearerToken: string;
    userId: string;
  };
  remembered?: boolean;
}
const getCookieName = (domain) => `${domain}-session-cookie`;
const workspaceSessionMaxAge = 60 * 60 * 24 * 30;
const workspaceCookieOptions = (remembered = true) => ({
  httpOnly: true,
  maxAge: remembered ? workspaceSessionMaxAge : undefined,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
});

function parseAuthCookie(value?: string) {
  if (!value) return {} as AuthCookie;

  try {
    return JSON.parse(value) as AuthCookie;
  } catch {
    return {} as AuthCookie;
  }
}

async function readWorkspaceCookie(domain: string) {
  const cookieStore = await cookies();
  return parseAuthCookie(cookieStore.get(getCookieName(domain))?.value);
}

function isUsableWorkspaceCookie(profile: AuthCookie, domain: string) {
  return Boolean(
    profile?.schoolId &&
      profile?.domain === domain &&
      profile?.auth?.bearerToken &&
      profile?.auth?.userId,
  );
}

function findCurrentDatedTerm<
  T extends {
    startDate: Date | null;
    endDate: Date | null;
    createdAt?: Date | null;
  },
>(terms: T[], now = new Date()) {
  const startedTerms = terms.filter(
    (term) => term.startDate && term.startDate <= now,
  );
  const activeBoundedTerm = startedTerms
    .filter((term) => term.endDate && term.endDate >= now)
    .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0];

  if (activeBoundedTerm) return activeBoundedTerm;

  return (
    startedTerms
      .filter((term) => !term.endDate)
      .sort((a, b) => b.startDate!.getTime() - a.startDate!.getTime())[0] ??
    null
  );
}

export async function getTenantDomain() {
  const requestHeaders = await headers();
  const tenantUrlConfig = getDashboardTenantUrlConfig();
  const tenantHeaderNames = getTenantUrlHeaderNames(tenantUrlConfig);
  const proxiedDomain = requestHeaders.get(tenantHeaderNames.domain);

  if (proxiedDomain) return { domain: proxiedDomain };

  const host = decodeURIComponent(requestHeaders.get("host") || "");
  const tenantUrlContext = resolveTenantUrlContext(
    {
      host,
      pathname: requestHeaders.get(tenantHeaderNames.pathname) || "/",
      protocol: requestHeaders.get("x-forwarded-proto"),
    },
    tenantUrlConfig,
  );

  if (tenantUrlContext.tenantSlug) {
    return { domain: tenantUrlContext.tenantSlug };
  }

  if (tenantUrlContext.isAppRootHost) return { domain: "" };

  // Step 3: custom domain fallback — strip port + optional "dashboard." from raw host
  const bareHost = tenantUrlContext.customDomainLookupHost;

  if (bareHost) {
    const record = await prisma.tenantDomain.findUnique({
      where: { customDomain: bareHost },
      select: { subdomain: true },
    });
    if (record?.subdomain) return { domain: record.subdomain };
  }

  return { domain: "" };
}
export async function getAuthCookie() {
  const { domain } = await getTenantDomain();
  const profile = await readWorkspaceCookie(domain);
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  const bearerToken = session?.session?.token;
  const userId = session?.user?.id;

  if (!bearerToken || !userId) return profile;

  if (
    isUsableWorkspaceCookie(profile, domain) &&
    profile.auth.userId === userId &&
    profile.auth.bearerToken === bearerToken
  ) {
    return profile;
  }

  return resolveTenantAuthCookie({
    authCookie: profile,
    bearerToken,
    domain,
    userId,
  });
}
export async function resetCookie({
  bearerToken,
  userId,
  redirectUrl = null,
  rememberMe = true,
}) {
  const { domain } = await getTenantDomain();
  let authCookie = await readWorkspaceCookie(domain);
  authCookie = await resolveTenantAuthCookie({
    authCookie,
    bearerToken,
    domain,
    rememberMe,
    userId,
  });

  const cookie = await cookies();
  const cookieName = getCookieName(domain);
  cookie.set(
    cookieName,
    JSON.stringify(authCookie),
    workspaceCookieOptions(authCookie.remembered !== false),
  );
  // if (redirectUrl) redirect(redirectUrl);
  return authCookie;
}

async function resolveTenantAuthCookie({
  authCookie,
  bearerToken,
  domain,
  rememberMe = authCookie.remembered !== false,
  userId,
}: {
  authCookie: AuthCookie;
  bearerToken: string;
  domain: string;
  rememberMe?: boolean;
  userId: string;
}) {
  const [school, user] = await Promise.all([
    prisma.schoolProfile.findFirst({
      where: {
        deletedAt: null,
        domains: {
          some: {
            deletedAt: null,
            subdomain: domain,
          },
        },
      },
      select: {
        id: true,
        accountId: true,
        sessions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          // take: 1,
          select: {
            id: true,
            title: true,
            terms: {
              // take: 1,
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                title: true,
                sessionId: true,
                startDate: true,
                endDate: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    }),
    prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        saasAccountId: true,
      },
    }),
  ]);

  if (
    school?.accountId &&
    user?.saasAccountId &&
    school.accountId !== user.saasAccountId
  ) {
    return {
      domain,
      auth: {
        bearerToken,
        userId,
      },
      remembered: rememberMe,
    } as AuthCookie;
  }

  const termProfiles =
    school?.sessions.flatMap((session) =>
      session.terms.map((term) => ({
        ...term,
        sessionId: session.id,
        sessionTitle: session.title,
      })),
    ) ?? [];
  const selectedTerm = termProfiles.find(
    (term) => term.id === authCookie?.termId,
  );
  const term =
    selectedTerm ?? findCurrentDatedTerm(termProfiles) ?? termProfiles[0];
  const session =
    school?.sessions?.find((s) => s.id === term?.sessionId) ||
    school?.sessions?.find((s) => s.id === authCookie?.sessionId) ||
    school?.sessions?.[0];

  authCookie = {
    ...authCookie,
    domain: domain,
    sessionId: session?.id,
    termId: term?.id,
    schoolId: school?.id,
    sessionTitle: session?.title ?? authCookie?.sessionTitle,
    termTitle: term?.title ?? authCookie?.termTitle,
    auth: {
      bearerToken,
      userId,
    },
    remembered: rememberMe,
  };
  return authCookie;
}

export async function clearAuthCookie() {
  const { domain } = await getTenantDomain();
  const cookie = await cookies();
  cookie.set(getCookieName(domain), "", {
    ...workspaceCookieOptions(false),
    maxAge: 0,
  });
}

export async function switchSessionTerm(
  input:
    | string
    | {
        termId?: string | null;
        termTitle?: string | null;
        sessionId?: string | null;
        sessionTitle?: string | null;
      },
  tx = null,
) {
  const { termId, termTitle, sessionId, sessionTitle } =
    typeof input === "string" ? { termId: input } : input;
  const { domain } = await getTenantDomain();

  const cookie = await cookies();
  const cookieName = getCookieName(domain);
  let authCookie = await getAuthCookie();
  authCookie = {
    ...authCookie,
    termId: termId ?? authCookie.termId,
    termTitle: termTitle ?? authCookie.termTitle,
    sessionId: sessionId ?? authCookie.sessionId,
    sessionTitle: sessionTitle ?? authCookie.sessionTitle,
  };
  cookie.set(
    cookieName,
    JSON.stringify(authCookie),
    workspaceCookieOptions(authCookie.remembered !== false),
  );
}
