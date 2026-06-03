import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";

import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Badge } from "@school-clerk/ui/badge";

export default async function SignupSuccessPage({ searchParams }) {
  const params = await searchParams;
  const email = params.email ?? "";
  const school = params.school ?? "Your school";
  const subdomain = params.subdomain ?? "";
  const workspaceUrl = params.workspaceUrl ?? "";
  const onboardingUrl = params.onboardingUrl ?? "";
  const loginUrl = params.loginUrl ?? "";
  const devOnboardingUrl = params.devOnboardingUrl ?? "";
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(179,134,35,0.16),_transparent_35%),#faf8f3] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            Workspace created successfully
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-border/70 shadow-xl">
          <CardHeader className="space-y-4 bg-white/95 px-6 pb-0 pt-8 text-center sm:px-10">
            <Badge className="mx-auto w-fit" variant="secondary">
              {subdomain ? `${subdomain} is reserved` : "Tenant reserved"}
            </Badge>
            <CardTitle className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              {school} is ready for onboarding
            </CardTitle>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              We’ve created your workspace, prepared your onboarding path, and
              sent the access details to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
          </CardHeader>

          <CardContent className="grid gap-6 bg-white/95 px-6 py-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-3xl border bg-muted/20 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Check your inbox</p>
                  <p className="text-sm text-muted-foreground">
                    Your signup success email includes the onboarding handoff.
                  </p>
                </div>
              </div>

              {workspaceUrl ? (
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Workspace URL
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-foreground">
                    {workspaceUrl}
                  </p>
                </div>
              ) : null}

              {isDev && devOnboardingUrl ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm font-medium">Dev shortcut</p>
                  </div>
                  <p className="mt-2 break-all text-sm text-amber-900/80">
                    {devOnboardingUrl}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-3xl border bg-[#171410] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                What happens next
              </p>
              <div className="space-y-3 text-sm text-white/75">
                <p>1. Sign in to your tenant workspace.</p>
                <p>2. Create your first academic session and term setup.</p>
                <p>3. Set up classrooms for the active session.</p>
                <p>4. Invite staff so your team can start onboarding.</p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {onboardingUrl ? (
                  <Button asChild size="lg" className="w-full">
                    <Link href={onboardingUrl}>
                      Continue onboarding
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                {loginUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href={loginUrl}>Go to workspace sign-in</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
