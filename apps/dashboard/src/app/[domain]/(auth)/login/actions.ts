"use server";

import { headers } from "next/headers";

import { resetCookie } from "@/actions/cookies/auth-cookie";
import { getTenantDomain } from "@/actions/cookies/auth-cookie";
import { auth } from "@/auth/server";
import { getFirstPermittedHref } from "@/components/sidebar/links";
import { findTenantDomainBySubdomain } from "@/utils/tenant-domain-context";
import { tenantRedirect } from "@/utils/tenant-redirect";
import { prisma } from "@school-clerk/db";

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function loginWithPasswordAction(formData: FormData) {
  const identifier = getFormValue(formData, "email").trim();
  const password = getFormValue(formData, "password");
  const rememberMe = formData.get("rememberMe") === "on";

  if (!identifier || !password) {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        "Email and password are required.",
      )}&email=${encodeURIComponent(identifier)}`,
    );
  }

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
      throw new Error("Login succeeded, but your session could not be prepared.");
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

    await tenantRedirect(
      !cookie?.sessionId && cookie?.domain
        ? "/onboarding/welcome"
        : defaultHref || "/",
    );
  } catch (error) {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Unable to sign in right now. Please try again.",
      )}&email=${encodeURIComponent(identifier)}`,
    );
  }
}

async function resolveLoginEmail(identifier: string) {
  if (identifier.includes("@")) {
    return identifier.toLowerCase();
  }

  const phone = identifier.replace(/[^\d+]/g, "").trim();
  const { domain } = await getTenantDomain();
  const tenant = domain ? await findTenantDomainBySubdomain(domain) : null;

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      phoneNo: phone,
      role: "Parent",
      ...(tenant?.saasAccountId ? { saasAccountId: tenant.saasAccountId } : {}),
    },
    select: {
      email: true,
    },
  });

  if (!user?.email) {
    throw new Error("No parent account was found for that phone number.");
  }

  return user.email;
}
