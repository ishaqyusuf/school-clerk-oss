import { Suspense } from "react";
import Link from "next/link";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { HydrateClient } from "@/trpc/server";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { NavLayoutClient } from "@/components/nav-layout-client";
import { GlobalModals } from "@/components/modals/global-modals";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function LayoutNew({ children }) {
  const cookie = await getAuthCookie();
  if (!cookie?.schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-xl rounded-2xl border border-amber-200/70 shadow-sm">
          <CardHeader className="gap-4 bg-gradient-to-br from-amber-50 via-background to-rose-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight">
                Your school workspace could not be loaded
              </CardTitle>
              <CardDescription className="leading-6 text-muted-foreground">
                We signed you in, but the dashboard could not resolve the
                school session for this tenant. This used to render a blank
                page; it now shows a recovery screen instead.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              Try signing out and back in. If it still happens, the tenant
              subdomain or school session setup for this environment may be
              incomplete.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="sm:w-auto">
                <Link href="/login">Go to login</Link>
              </Button>
              <Button asChild variant="outline" className="sm:w-auto">
                <Link href="/signout">Sign out</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <HydrateClient>
      <NavLayoutClient>{children}</NavLayoutClient>

      <Suspense>
        <GlobalSheets />
        <GlobalModals />
      </Suspense>
    </HydrateClient>
  );
}
