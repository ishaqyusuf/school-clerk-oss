"use client";

import { useEffect, useRef } from "react";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent, CardHeader } from "@school-clerk/ui/card";
import type { SignupCompletion as SignupCompletionResult } from "@/features/signup/completion-types";

export function SignupCompletion({ result }: { result: SignupCompletionResult }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const status = result.setupStatus;
  const emailLabels = {
    accepted: "Accepted by email provider; inbox delivery is not confirmed.",
    console: "QA console mode; no live email sent.",
    skipped: "Skipped because current account access or preferences did not allow it.",
    "needs-attention": "Not confirmed. You can continue to sign in and request help if needed.",
  };
  const details = [
    ["School addresses", status.domains === "submitted"
      ? "Registration request processed; DNS and HTTPS readiness are not confirmed."
      : status.domains === "not-requested" ? "No hosted-domain request was needed in this environment."
      : "Registration needs attention. Contact support if your school sign-in address is unavailable."],
    ["Verification email", emailLabels[status.verificationEmail]],
    ["Workspace email", emailLabels[status.workspaceEmail]],
    ["Welcome notification", status.notification === "created" ? "Created in your school workspace."
      : status.notification === "skipped" ? "Skipped by current access or preferences." : "Could not be confirmed."],
  ];

  return (
    <main className="flex min-h-screen justify-center bg-muted/20 px-4 py-8 sm:items-center">
      <Card className="h-fit w-full min-w-0 max-w-xl">
        <CardHeader className="space-y-3">
          <h1 ref={heading} tabIndex={-1} className="break-words text-2xl font-semibold">Your school account was created</h1>
          <p className="break-words text-sm leading-6 text-muted-foreground">
            {result.schoolName} is saved. Do not submit signup again to retry an email or domain request.
            Sign in with the password you chose to continue setup.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-4">
            {details.map(([label, description]) => (
              <div key={label} className="min-w-0 space-y-1">
                <dt className="text-sm font-medium">{label}</dt>
                <dd className="break-words text-sm leading-6 text-muted-foreground">{description}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-6">Missing the verification email? After sign-in, use “Verify email or request a fresh link” on the welcome page.</p>
          <Button asChild className="min-h-11 w-full whitespace-normal">
            <a href={result.onboardingLoginUrl}>Sign in and continue setup</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
