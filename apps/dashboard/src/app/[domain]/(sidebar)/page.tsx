import { getServerWorkspace as getAuthCookie } from "@/trpc/request-context";
import { AddStudentQuickLink } from "@/components/dashboard/add-student-quick-link";
import { PromotionQuickLink } from "@/components/dashboard/promotion-quick-link";
import { ReceiveFeeButton } from "@/components/dashboard/receive-fee-button";
import { TermSwitcher } from "@/components/sidebar/term-switcher";
import { getSession } from "@/auth/server";
import { DashboardStats, DashboardStatsSkeleton } from "@/components/dashboard/dashboard-stats";
import { ErrorFallback } from "@/components/error-fallback";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import {
  Bell,
  BookOpen,
  School,
  Wallet,
} from "lucide-react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { redirect } from "next/navigation";

const quickLinks = [
  { label: "Academic", icon: BookOpen, href: "/academic" },
  { label: "Finance", icon: Wallet, href: "/finance" },
  { label: "Classes", icon: School, href: "/academic/classes" },
];

export default async function Page({ params }) {
  const { domain } = await params;
  const cookie = await getAuthCookie();
  const sessionId = cookie?.sessionId ?? "";
  const schoolId = cookie?.schoolId ?? "";
  const termTitle = cookie?.termTitle ?? "—";
  const sessionTitle = cookie?.sessionTitle ?? "—";

  const session = await getSession();
  const role = (session?.user as { role?: string | null } | undefined)?.role ?? null;
  if (role === "Teacher") redirect("/teacher");

  if (role === "Staff") {
    return <StaffDashboard sessionTitle={sessionTitle} termTitle={termTitle} />;
  }


  return (
    <div className="space-y-8 py-4">
      <PageTitle>Dashboard</PageTitle>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {sessionTitle && (
            <Badge variant="outline" className="text-xs">
              {sessionTitle}
            </Badge>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
          <span className="shrink-0">Current term:</span>
          <TermSwitcher display="dashboard" fallbackTermTitle={termTitle} />
        </div>
      </div>

      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats schoolId={schoolId} sessionId={sessionId} />
        </Suspense>
      </ErrorBoundary>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AddStudentQuickLink />
          {quickLinks.map((l) => (
            <Button
              key={l.label}
              variant="outline"
              className="h-auto flex-col gap-2 py-5"
              asChild
            >
              <Link href={`${l.href}`}>
                <l.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{l.label}</span>
              </Link>
            </Button>
          ))}
          <PromotionQuickLink />
          <ReceiveFeeButton />
        </div>
      </div>
    </div>
  );
}

function StaffDashboard({
  sessionTitle,
  termTitle,
}: {
  sessionTitle: string;
  termTitle: string;
}) {
  return (
    <div className="space-y-6 py-4">
      <PageTitle>Dashboard</PageTitle>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {sessionTitle ? (
            <Badge variant="outline">{sessionTitle}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Current term: {termTitle}
        </p>
      </div>
      <Card className="max-w-2xl rounded-2xl">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="size-5" />
          </div>
          <CardTitle>Staff workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Your staff account currently has view-only dashboard access. School
            management tools remain available only to the roles assigned to
            them.
          </p>
          <Button asChild variant="outline">
            <Link href="/notifications">View notifications</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
