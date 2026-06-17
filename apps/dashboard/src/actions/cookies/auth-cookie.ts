"use server";
import { prisma } from "@school-clerk/db";
import {
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
} from "@school-clerk/tenant-url";
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
}
const getCookieName = (domain) => `${domain}-session-cookie`;

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
  const cookieStore = await cookies();
  const cookieName = getCookieName(domain);
  const value = cookieStore.get(cookieName)?.value;
  const profile = JSON.parse((value || "{}") as any) as AuthCookie;
  return profile;
}
export async function resetCookie({ bearerToken, userId, redirectUrl = null }) {
  let authCookie = await getAuthCookie();
  const { domain } = await getTenantDomain();
  console.log({ domain });
  const school = await prisma.schoolProfile.findFirst({
    where: {
      domains: {
        some: {
          subdomain: domain,
        },
      },
    },
    select: {
      id: true,
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
  });

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
  };
  const cookie = await cookies();
  const cookieName = getCookieName(domain);
  cookie.set(cookieName, JSON.stringify(authCookie));
  // if (redirectUrl) redirect(redirectUrl);
  return authCookie;
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
  cookie.set(cookieName, JSON.stringify(authCookie));
}
