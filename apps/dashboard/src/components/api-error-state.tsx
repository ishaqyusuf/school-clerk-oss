"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, RefreshCcw, ShieldAlert } from "lucide-react";

import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";

type ApiErrorStateProps = {
  title?: string;
  description?: string;
  error?: unknown;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
};

function getErrorMessage(error: unknown) {
  if (!error) return "";

  if (typeof error === "string") return error;

  if (error instanceof Error) return error.message;

  if (typeof error === "object" && "message" in error) {
    const message = error.message;
    return typeof message === "string" ? message : "";
  }

  return "";
}

export function ApiErrorState({
  title = "We couldn't load this page",
  description = "A request failed while loading your dashboard. Try again, and if it keeps happening, sign in again to refresh your school workspace.",
  error,
  retryLabel = "Try again",
  onRetry,
  secondaryHref = "/signout",
  secondaryLabel = "Sign out",
}: ApiErrorStateProps) {
  const message = useMemo(() => getErrorMessage(error), [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl overflow-hidden rounded-2xl border border-amber-200/70 shadow-sm">
        <CardHeader className="gap-4 bg-gradient-to-br from-amber-50 via-background to-rose-50">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-1">
                <p className="font-medium">What you can do</p>
                <p className="text-amber-900/80">
                  Refresh the page first. If the problem started right after
                  login, signing out and in again usually restores the tenant
                  session.
                </p>
              </div>
            </div>
          </div>

          {message ? (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="font-medium text-foreground">Technical details</p>
              <p className="mt-1 break-words text-muted-foreground">
                {message}
              </p>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 sm:flex-row sm:justify-between">
          <div className="text-xs leading-5 text-muted-foreground">
            Dashboard errors are now surfaced here instead of failing silently.
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {secondaryHref ? (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            ) : null}
            {onRetry ? (
              <Button onClick={onRetry} className="flex-1 sm:flex-none">
                <RefreshCcw className="mr-2 h-4 w-4" />
                {retryLabel}
              </Button>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
