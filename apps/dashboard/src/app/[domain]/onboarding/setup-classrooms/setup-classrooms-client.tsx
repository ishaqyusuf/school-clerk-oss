"use client";

import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { FormContext } from "@/components/classroom/form-context";
import { Form as ClassroomForm } from "@/components/forms/classroom-form";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";

export function SetupClassroomsOnboardingClient({
  domain,
}: {
  domain: string;
}) {
  void domain;
  const [savedCount, setSavedCount] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[2rem] border-border/70 shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="rounded-full px-4 py-1.5 text-sm"
            >
              Onboarding step 3 of 4
            </Badge>
            <h1 className="text-3xl font-semibold tracking-[-0.05em]">
              Set up classrooms
            </h1>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Add the classes and streams teachers will be assigned to during
              staff onboarding.
            </p>
          </div>

          {savedCount > 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">
                  {savedCount} classroom{savedCount === 1 ? "" : "s"} saved
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                You can add another classroom or continue to staff invites.
              </p>
            </div>
          ) : null}

          <FormContext>
            <ClassroomForm
              submitLabel="Save classroom"
              submitPlacement="inline"
              onSuccess={() => setSavedCount((count) => count + 1)}
            />
          </FormContext>

          <div className="flex justify-end border-t pt-5">
            <Button asChild size="lg">
              <Link href="/onboarding/invite-staff">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/70 bg-[#171410] text-white shadow-lg">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              Academic structure
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Classrooms before staff
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-white/75">
            <p>
              Staff invites work best after the core classrooms are available.
            </p>
            <p>
              Use sub-classes for streams like A/B/C or Emerald/Gold/Silver.
            </p>
            <p>More classrooms can be added later from Academic Classes.</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <p className="font-medium">Recommended setup</p>
            </div>
            <p className="mt-2">
              Start with the active classes for this academic session, then add
              staff assignments in the next step.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
