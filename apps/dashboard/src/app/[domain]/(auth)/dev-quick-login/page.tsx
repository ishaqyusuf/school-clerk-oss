"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { prepareDevQuickLogin } from "@/actions/dev-quick-login";
import { authClient } from "@/auth/client";

const quickLoginPassword = "lorem-ipsum";

export default function DevQuickLoginPage() {
  const params = useParams<{ domain: string }>();
  const searchParams = useSearchParams();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    if (process.env.NODE_ENV === "production") {
      window.location.replace("/login");
      return;
    }

    const email = searchParams.get("email") ?? "";
    const returnTo = searchParams.get("return_to") ?? "";
    const domain = params.domain;

    if (!email || !domain) {
      window.location.replace("/login");
      return;
    }

    void (async () => {
      try {
        const prepared = await prepareDevQuickLogin({
          domain,
          email,
        });

        if (prepared.isOnboarded === false && prepared.staffId) {
          const onboardingUrl = new URL(
            "/reset-password",
            window.location.origin,
          );
          onboardingUrl.searchParams.set("onboarding", "1");
          onboardingUrl.searchParams.set("staffId", prepared.staffId);
          onboardingUrl.searchParams.set("email", prepared.email);
          onboardingUrl.searchParams.set("token", prepared.resetToken);
          window.location.replace(onboardingUrl.toString());
          return;
        }

        const resetResponse = await authClient.resetPassword({
          newPassword: quickLoginPassword,
          token: prepared.resetToken,
        });

        if (resetResponse.error) {
          throw new Error(
            resetResponse.error.message ||
              "Could not prepare this account for quick login.",
          );
        }

        const nextUrl = new URL("/login", window.location.origin);
        nextUrl.searchParams.set("email", prepared.email);
        nextUrl.searchParams.set("password", quickLoginPassword);
        nextUrl.searchParams.set("autologin", "1");
        if (prepared.restoreToken) {
          nextUrl.searchParams.set("dev_restore_token", prepared.restoreToken);
        }
        if (returnTo) {
          nextUrl.searchParams.set("return_to", returnTo);
        }

        window.location.replace(nextUrl.toString());
      } catch {
        const nextUrl = new URL("/login", window.location.origin);
        nextUrl.searchParams.set("email", email);
        window.location.replace(nextUrl.toString());
      }
    })();
  }, [params.domain, searchParams]);

  return null;
}
