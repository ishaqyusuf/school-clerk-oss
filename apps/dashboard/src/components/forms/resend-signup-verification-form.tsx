"use client";

import { useActionState } from "react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { resendSignupVerificationAction } from "@/actions/resend-signup-verification";

export function ResendSignupVerificationForm() {
  const [state, action, pending] = useActionState(resendSignupVerificationAction, { status: "ready" });
  const messages = {
    ready: "Need a new link? Sign in as this school's owner to email a fresh link to your own stored address.",
    sign_in: "Sign in as this school's owner, then return here to request a fresh verification email.",
    unavailable: "A fresh email could not be submitted. Use this school's owner account, wait at least one minute and try again. Contact support if it still fails.",
    verified: "The signed-in owner account is already verified. No email was sent.",
    cooldown: "Please wait at least one minute before requesting another email.",
    accepted: "The email provider accepted your request. Check your inbox and spam folder; delivery may take a few minutes. Only the latest link will work.",
    console: "This environment uses console-only QA delivery. No live email was sent. Ask the environment owner to use an approved QA delivery route.",
  };

  return (
    <section aria-label="Request a fresh verification email" className="min-w-0 space-y-3 border-t pt-4">
      <p role="status" aria-live="polite" aria-atomic="true" className="break-words text-sm leading-6 text-muted-foreground">
        {pending ? "Requesting a fresh email…" : messages[state.status]}
      </p>
      {state.status === "sign_in" ? (
        <Button asChild variant="outline" className="min-h-11 w-full whitespace-normal">
          <Link href="/login?return_to=%2Fverify-email">Sign in to request a new link</Link>
        </Button>
      ) : state.status !== "verified" && (
        <form action={action} aria-busy={pending}>
          <Button type="submit" variant="outline" disabled={pending} className="min-h-11 w-full whitespace-normal">
            {pending ? "Requesting…" : "Email me a fresh verification link"}
          </Button>
        </form>
      )}
    </section>
  );
}
