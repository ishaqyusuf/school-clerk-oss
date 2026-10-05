"use client";

import { useActionState } from "react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { verifySignupEmailAction } from "@/actions/verify-signup-email";
import { ResendSignupVerificationForm } from "./resend-signup-verification-form";

export function SignupEmailVerificationForm({ token }: { token: string | null }) {
  const [state, action, pending] = useActionState(verifySignupEmailAction, { status: "ready" });
  const verified = state.status === "verified";
  const unavailable = !token || state.status === "unavailable";

  return (
    <Card className="w-full min-w-0 max-w-lg border-border/70">
      <CardHeader className="items-center space-y-4 text-center">
        <MailCheck aria-hidden="true" className="size-10 text-primary" />
        <CardTitle className="break-words text-2xl">
          {verified ? "Email verified" : "Confirm your email"}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        <div role="status" aria-live="polite" aria-atomic="true" className="break-words text-sm leading-6">
          {verified ? (
            <p>Your email is verified. Sign in to continue school setup. This confirmation has not signed you in.</p>
          ) : unavailable ? (
            <Alert variant="destructive">
              <AlertDescription className="break-words">
                This link could not be confirmed. It may have expired, been used, or belong to another school.
                Open the latest verification email on its original school address, or request a fresh link below.
              </AlertDescription>
            </Alert>
          ) : (
            <p>Confirm the email used to create your school account. Opening this page does not verify your email until you press the button.</p>
          )}
          {pending && <p>Confirming your email…</p>}
        </div>
        {!verified && token && (
          <form action={action} aria-busy={pending}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" disabled={pending} className="min-h-11 w-full whitespace-normal">
              {pending ? "Confirming…" : unavailable ? "Try confirmation again" : "Confirm email"}
            </Button>
          </form>
        )}
        {!verified && <ResendSignupVerificationForm />}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="min-h-11 w-full whitespace-normal">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
