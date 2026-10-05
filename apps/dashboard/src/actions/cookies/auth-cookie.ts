"use server";
import { prisma, resolveTenantWorkspace } from "@school-clerk/db";
import {
  getTenantUrlHeaderNames,
  resolveTenantUrlContext,
} from "@school-clerk/tenant-url";
import { getSession } from "@/auth/server";
import { measurePerformance } from "@school-clerk/utils/server-performance";
import { findTenantDomainByCustomDomain } from "@/utils/tenant-domain-context";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import {
  emptyWorkspaceCookie, parseWorkspaceCookie, workspaceCookieOptions, workspaceCookieSelection,
  type AuthCookie,
} from "@/utils/workspace-cookie";
import { cookies, headers } from "next/headers";
import { z } from "zod";

export type { AuthCookie } from "@/utils/workspace-cookie";

const getCookieName = (domain: string) => `${domain}-session-cookie`;

async function readWorkspaceCookie(domain: string) {
  return parseWorkspaceCookie((await cookies()).get(getCookieName(domain))?.value);
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
    const record = await findTenantDomainByCustomDomain(bareHost);
    if (record?.subdomain) return { domain: record.subdomain };
  }

  return { domain: "" };
}
export async function getAuthCookie(): Promise<AuthCookie> {
  const { domain } = await getTenantDomain();
  const session = await measurePerformance("workspace.session", getSession);
  if (!session?.session.token || !session.user.id) return emptyWorkspaceCookie(domain);
  return resolveTenantAuthCookie({
    authCookie: await readWorkspaceCookie(domain),
    bearerToken: session.session.token,
    domain,
    userId: session.user.id,
  });
}

export async function resetCookie(input: {
  bearerToken: string; userId: string; redirectUrl?: string | null; rememberMe?: boolean;
}) {
  const parsed = z.object({
    bearerToken: z.string().min(1).max(512),
    userId: z.string().min(1).max(200),
    rememberMe: z.boolean().default(true),
  }).parse(input);
  const { domain } = await getTenantDomain();
  // A successful sign-in can set new auth cookies during this same request.
  // Validate the supplied opaque bearer against storage, not an old request's
  // signed cookie or the caller's user ID alone. This sets no Better Auth cookie.
  const profile = await resolveTenantAuthCookie({
    authCookie: await readWorkspaceCookie(domain),
    bearerToken: parsed.bearerToken,
    userId: parsed.userId,
    domain,
    rememberMe: parsed.rememberMe,
  });
  const cookieStore = await cookies();
  cookieStore.set(getCookieName(domain), profile.schoolId ? JSON.stringify(profile) : "",
    profile.schoolId ? workspaceCookieOptions(profile.remembered === true)
      : { ...workspaceCookieOptions(false), maxAge: 0 });
  return profile;
}

async function resolveTenantAuthCookie({
  authCookie, bearerToken, domain, userId, rememberMe = authCookie?.remembered === true,
}: {
  authCookie: AuthCookie | null; bearerToken: string; domain: string; userId: string; rememberMe?: boolean;
}): Promise<AuthCookie> {
  const workspace = await measurePerformance("workspace.resolve", () => resolveTenantWorkspace(prisma, {
    token: bearerToken, userId, tenantSlug: domain,
    selection: workspaceCookieSelection(authCookie, { domain, token: bearerToken, userId }),
  }));
  return workspace ? { ...workspace, auth: { bearerToken, userId }, remembered: rememberMe }
    : emptyWorkspaceCookie(domain);
}

export async function clearAuthCookie() {
  const { domain } = await getTenantDomain();
  (await cookies()).set(getCookieName(domain), "", { ...workspaceCookieOptions(false), maxAge: 0 });
}

export async function switchSessionTerm(
  input: string | {
    termId?: string | null; termTitle?: string | null;
    sessionId?: string | null; sessionTitle?: string | null;
  },
  _tx: unknown = null,
) {
  const selection = z.object({
    termId: z.string().min(1).max(200).nullish(),
    sessionId: z.string().min(1).max(200).nullish(),
  }).refine((value) => Boolean(value.termId || value.sessionId), {
    message: "Select an academic session or term.",
  }).parse(typeof input === "string" ? { termId: input } : input);
  const profile = await getAuthCookie();
  if (!profile.schoolId || !profile.auth.userId || !profile.auth.bearerToken) {
    throw new Error("A signed-in school workspace is required.");
  }
  const workspace = await resolveTenantWorkspace(prisma, {
    token: profile.auth.bearerToken, userId: profile.auth.userId, tenantSlug: profile.domain,
    strictSelection: true,
    selection: { schoolId: profile.schoolId, termId: selection.termId ?? undefined,
      sessionId: selection.sessionId ?? undefined },
  });
  if (!workspace) throw new Error("The selected academic session or term is unavailable in this school.");
  const nextCookie: AuthCookie = {
    ...workspace, auth: profile.auth, remembered: profile.remembered === true,
  };
  (await cookies()).set(getCookieName(profile.domain), JSON.stringify(nextCookie),
    workspaceCookieOptions(nextCookie.remembered));
}
