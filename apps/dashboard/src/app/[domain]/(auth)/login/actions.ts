"use server";

import { headers } from "next/headers";

import { resetCookie } from "@/actions/cookies/auth-cookie";
import { auth } from "@/auth/server";
import { getFirstPermittedHref } from "@/components/sidebar/links";
import { tenantRedirect } from "@/utils/tenant-redirect";

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function loginWithPasswordAction(formData: FormData) {
  const email = getFormValue(formData, "email").trim();
  const password = getFormValue(formData, "password");
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) {
    await tenantRedirect(
      `/login?error=${encodeURIComponent(
        "Email and password are required.",
      )}&email=${encodeURIComponent(email)}`,
    );
  }

  try {
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
      )}&email=${encodeURIComponent(email)}`,
    );
  }
}
