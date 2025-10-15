"use server";
import { env } from "@/env";
import { prisma } from "@school-clerk/db";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export interface AuthCookie {
  domain: string;
  sessionId?: string;
  schoolId?: string;
  termId?: string;
  sessionTitle: string;
  termTitle: string;
  auth: {
    bearerToken: string;
    userId: string;
  };
}
const getCookieName = (domain) => `${domain}-session-cookie`;
export async function getTenantDomain() {
  let host = decodeURIComponent((await headers()).get("host") || "");
  if (env.NODE_ENV == "development") {
    host = host?.replaceAll(`.${env.APP_ROOT_DOMAIN}`, ".vercel.app");
  }
  return {
    domain: host?.replace(`.${env.APP_ROOT_DOMAIN}`, ""),
  };
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
  const school = await prisma.schoolProfile.findFirst({
    where: {
      subDomain: domain,
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
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });
  const session =
    school.sessions.find((s) => s.id === authCookie?.sessionId) ||
    school?.sessions?.[0];
  const term =
    session.terms.find((s) => s.id === authCookie?.termId) ||
    session.terms?.[0];

  authCookie = {
    ...authCookie,
    domain: domain,
    sessionId: session?.id,
    termId: term?.id,
    schoolId: school?.id,
    sessionTitle: session?.title,
    termTitle: term?.title,
    auth: {
      bearerToken,
      userId,
    },
  };
  const cookie = await cookies();
  const cookieName = getCookieName(domain);
  cookie.set(cookieName, JSON.stringify(authCookie));
  if (redirectUrl) redirect(redirectUrl);
  return authCookie;
}
export async function switchSessionTerm(
  { termId, termTitle, sessionId, sessionTitle },
  tx = null
) {
  const { domain } = await getTenantDomain();

  const cookie = await cookies();
  const cookieName = getCookieName(domain);
  let authCookie = await getAuthCookie();
  authCookie = {
    ...authCookie,
    termId,
    termTitle,
    sessionId,
    sessionTitle,
  };
  cookie.set(cookieName, JSON.stringify(authCookie));
}
