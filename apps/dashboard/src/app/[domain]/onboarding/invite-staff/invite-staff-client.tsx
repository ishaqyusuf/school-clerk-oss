"use client";

import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Users } from "lucide-react";

import { Form as StaffForm } from "@/components/forms/staff-form";
import { FormContext } from "@/components/staffs/form-context";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";

export function InviteStaffOnboardingClient({ domain }: { domain: string }) {
  void domain;
  const [inviteSent, setInviteSent] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[2rem] border-border/70 shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Badge
                variant="secondary"
                className="w-fit rounded-full px-4 py-1.5 text-sm"
              >
                Onboarding step 5 of 5
              </Badge>
              <Button asChild variant="outline" size="sm">
                <Link href="/">
                  Go to dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em]">
              Invite your first staff member
            </h1>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Bring one teacher or staff lead into the workspace so you can
              start using School Clerk as a real team, not a solo setup.
            </p>
          </div>

          {inviteSent ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">Onboarding invite sent</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                Your workspace now has its first team invitation in flight. You
                can head into the dashboard and keep building from there.
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/">
                    Go to dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <FormContext>
            <StaffForm
              submitLabel="Send onboarding invite"
              onSuccess={() => setInviteSent(true)}
            />
          </FormContext>

          {!inviteSent ? (
            <div className="flex flex-col gap-3 border-t pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>You can invite staff later from the staff dashboard.</p>
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Skip for now</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/70 bg-[#171410] text-white shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              Team activation
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Start with one strong invite
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/75">
            <p>
              Invite the staff member who will help you validate the academic
              setup first.
            </p>
            <p>
              Teacher roles can be assigned directly to classrooms and subjects
              during onboarding.
            </p>
            <p>
              If you want to finish setup later, you can still continue to the
              dashboard after sending the first invite.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <p className="font-medium">Recommended first invite</p>
            </div>
            <p className="mt-2">
              A lead teacher or operations manager who can confirm the session,
              classroom, and role setup with you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
