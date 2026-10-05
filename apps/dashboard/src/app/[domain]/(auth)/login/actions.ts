"use server";

import { headers } from "next/headers";

import { resetCookie } from "@/actions/cookies/auth-cookie";
import { getTenantDomain } from "@/actions/cookies/auth-cookie";
import { auth } from "@/auth/server";
import { getFirstPermittedHref } from "@/components/sidebar/links";
import { tenantRedirect } from "@/utils/tenant-redirect";
import { getDevelopmentLoginSchool, getDevelopmentLoginUser, resolveParentPhoneLoginEmail, prisma } from "@school-clerk/db";
import { isDevelopmentQuickLoginEnabled, isLoopbackRequestHost } from "@school-clerk/auth/development";
import { normalizeAuthReturnTo } from "@school-clerk/utils/auth-return-to";

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function loginWithPasswordAction(formData: FormData) {
  const identifier = getFormValue(formData, "email").trim();
  const password = getFormValue(formData, "password");
  const quickLoginUserId = getFormValue(formData, "userId").trim();
  const returnTo = getFormValue(formData, "returnTo");
  const rememberMe = formData.get("rememberMe") === "on";

  if (quickLoginUserId) {
    return loginWithDevQuickLogin({
      email: identifier,
      rememberMe,
      returnTo,
      userId: quickLoginUserId,
    });
  }

  if (!identifier || !password) {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        "Email and password are required.",
      )}&email=${encodeURIComponent(identifier)}`,
    );
  }

  let destination = "/";
  try {
    const email = await resolveLoginEmail(identifier);
    const resp = await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe,
      },
      headers: new Headers(await headers()),
    });

    const bearerToken = resp?.token;
    const userId = resp?.user?.id;

    if (!bearerToken || !userId) {
      throw new Error(
        "Login succeeded, but your session could not be prepared.",
      );
    }

    const defaultHref = getFirstPermittedHref({
      role: resp.user.role,
    });

    const cookie = await resetCookie({
      bearerToken,
      rememberMe,
      userId,
      redirectUrl: defaultHref,
    });

    if (!cookie?.schoolId) {
      throw new Error(
        "Signed in, but your school workspace could not be loaded for this tenant.",
      );
    }

    destination = normalizeAuthReturnTo(returnTo) ??
        (!cookie?.sessionId && cookie?.domain
          ? "/onboarding/welcome"
          : defaultHref || "/");
  } catch {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        "Unable to sign in. Check your credentials and school workspace.",
      )}&email=${encodeURIComponent(identifier)}`,
    );
  }
  await tenantRedirect(destination);
}

async function loginWithDevQuickLogin({
  email,
  rememberMe,
  returnTo,
  userId,
}: {
  email: string;
  rememberMe: boolean;
  returnTo: string;
  userId: string;
}) {
  if (!isDevelopmentQuickLoginEnabled() || !isLoopbackRequestHost((await headers()).get("host"))) {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        "Quick login is unavailable.",
      )}&email=${encodeURIComponent(email)}`,
    );
  }

  let destination = "/";
  try {
    const { domain } = await getTenantDomain();
    const tenant = domain ? await getDevelopmentLoginSchool(prisma, domain) : null;

    if (!tenant) {
      throw new Error("Quick login tenant could not be resolved.");
    }

    const user = await getDevelopmentLoginUser(prisma, { schoolId: tenant.id, userId });

    if (!user) {
      throw new Error("Quick login user was not found for this tenant.");
    }

    const resp = await auth.api.devQuickLogin({
      body: {
        rememberMe,
        userId: user.id,
        schoolId: tenant.id,
      },
      headers: new Headers(await headers()),
    });

    const { token: bearerToken } = await parseDevQuickLoginResponse(resp);

    if (!bearerToken) {
      throw new Error(
        "Quick login succeeded, but no session token was returned.",
      );
    }

    const defaultHref = getFirstPermittedHref({
      role: user.role,
    });

    const cookie = await resetCookie({
      bearerToken,
      rememberMe,
      userId: user.id,
      redirectUrl: defaultHref,
    });

    if (!cookie?.schoolId) {
      throw new Error(
        "Signed in, but your school workspace could not be loaded for this tenant.",
      );
    }

    destination = normalizeAuthReturnTo(returnTo) ??
        (!cookie?.sessionId && cookie?.domain
          ? "/onboarding/welcome"
          : defaultHref || "/");
  } catch {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        "Unable to sign in with quick login right now.",
      )}&email=${encodeURIComponent(email)}`,
    );
  }
  await tenantRedirect(destination);
}

async function parseDevQuickLoginResponse(resp: Response | { token?: string }) {
  if (resp instanceof Response) {
    if (!resp.ok) {
      throw new Error("Unable to create quick login session.");
    }

    return (await resp.json()) as { token?: string };
  }

  return resp;
}

async function resolveLoginEmail(identifier: string) {
  if (identifier.includes("@")) {
    return identifier.toLowerCase();
  }

  const phone = identifier.replace(/[^\d+]/g, "").trim();
  const { domain } = await getTenantDomain();
  const email = domain ? await resolveParentPhoneLoginEmail(prisma, { phone, tenantSlug: domain }) : null;
  if (!email) throw new Error("Invalid email or password.");
  return email;
}
