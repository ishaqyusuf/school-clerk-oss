import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe, Sparkles } from "lucide-react";

import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";

export default async function Page({ params }) {
  await params;
  const cookie = await getAuthCookie();
  const host = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  const schoolUrl = cookie?.domain ? `${cookie.domain}.${host}` : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(184,134,11,0.14),_transparent_32%),#faf8f3] px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex justify-center">
          <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-sm">
            Onboarding step 1 of 3
          </Badge>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-border/70 shadow-xl">
          <CardHeader className="space-y-4 px-6 pt-8 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-semibold tracking-[-0.05em]">
              Your workspace is live
            </CardTitle>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Your school profile has already been created. Let’s make the
              workspace operational by defining your first academic session.
            </p>
          </CardHeader>

          <CardContent className="grid gap-5 px-6 pb-0 sm:px-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border bg-muted/20 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Workspace URL</p>
                  <p className="text-sm text-muted-foreground">
                    This is the address your team will use.
                  </p>
                </div>
              </div>
              {schoolUrl ? (
                <p className="mt-4 break-all rounded-2xl border bg-background p-4 text-sm font-medium text-foreground">
                  {schoolUrl}
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border bg-[#171410] p-5 text-white">
              <div className="flex items-center gap-2 text-white/70">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-medium">Next up</p>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/75">
                <p>1. Create your first academic session.</p>
                <p>2. Define the terms your school will use.</p>
                <p>3. Move straight into staff invitations.</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center px-6 py-8 sm:px-10">
            <Button asChild size="lg">
              <Link href="/onboarding/create-academic-session">
                Set up academic session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
