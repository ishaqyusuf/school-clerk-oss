"use client";
import React from "react";
import {
  Plus,
  Calendar,
  Settings,
  ArrowUpCircle,
  ArrowRight,
  ChevronDown,
  Lock,
  Play,
  RotateCcw,
  Pencil,
  Check,
  TriangleAlert,
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { Card } from "@school-clerk/ui/composite";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Skeleton } from "@school-clerk/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { cn } from "@school-clerk/ui/cn";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useTenantRouter } from "@school-clerk/tenant-url/next";
import { useAcademicParams } from "@/hooks/use-academic-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
  EditAcademicMetadataModal,
  type AcademicMetadataTarget,
} from "@/components/modals/edit-academic-metadata-modal";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { useAuth } from "@/hooks/use-auth";

type DashboardSession =
  RouterOutputs["academics"]["dashboard"]["sessions"][number];
type DashboardTerm = DashboardSession["terms"][number];
type TermWithSession = DashboardTerm & { session: DashboardSession };

/** One status vocabulary for the whole page (ADR-0099). */
type TermState = "working" | "open" | "ready" | "draft" | "closed" | "completed";

const STATE_LABEL: Record<TermState, string> = {
  working: "Working",
  open: "Open",
  ready: "Ready",
  draft: "Draft",
  closed: "Closed",
  completed: "Completed",
};

const STATE_BADGE: Record<
  TermState,
  "success" | "warning" | "info" | "tag" | "neutral"
> = {
  working: "success",
  open: "warning",
  ready: "info",
  draft: "tag",
  closed: "neutral",
  completed: "neutral",
};

function termState(term: DashboardTerm, workingTermId?: string | null): TermState {
  if (term.id === workingTermId) return "working";
  switch (term.lifecycleStatus) {
    case "ACTIVE":
      return "open";
    case "READY":
      return "ready";
    case "DRAFT":
      return "draft";
    case "CLOSED":
      return "closed";
    default:
      return "completed";
  }
}

function formatDate(value: Date | string | null | undefined) {
  return value ? format(new Date(value), "d MMM yyyy") : null;
}

function termDates(term: DashboardTerm) {
  const start = formatDate(term.startDate);
  if (!start) return "Not scheduled";
  return `${start} – ${formatDate(term.endDate) ?? "no end date"}`;
}

function StateBadge({ state }: { state: TermState }) {
  return (
    <Badge variant={STATE_BADGE[state]} className="gap-1.5 rounded-full">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATE_LABEL[state]}
    </Badge>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const Dashboard = () => {
  const auth = useAuth();
  const router = useTenantRouter();
  const canManageAcademics = auth.role === "Admin" || auth.role === "ADMIN";
  const { setParams } = useAcademicParams();
  const [expandedSessionIds, setExpandedSessionIds] = React.useState<
    Set<string> | null
  >(null);
  const [metadataTarget, setMetadataTarget] =
    React.useState<AcademicMetadataTarget | null>(null);
  const [closeTermModal, setCloseTermModal] =
    React.useState<DashboardTerm | null>(null);
  const [activateTermModal, setActivateTermModal] =
    React.useState<TermWithSession | null>(null);
  const [resetTermModal, setResetTermModal] =
    React.useState<DashboardTerm | null>(null);
  const [resetConfirmation, setResetConfirmation] = React.useState("");
  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery(
    _trpc.academics.dashboard.queryOptions({}),
  );
  const sessions = dashboard?.sessions || [];
  const promotionIds = dashboard?.promotionIds ?? null;
  const currentSession = sessions.find(
    (session) => session.status === "current",
  );
  const currentTerm = currentSession?.currentTerm ?? null;
  const workingTermId = currentTerm?.id ?? null;
  const allTerms: TermWithSession[] = sessions.flatMap((session) =>
    session.terms.map((term) => ({ ...term, session })),
  );
  const workingTerm = allTerms.find((term) => term.id === workingTermId) ?? null;
  const openTerms = allTerms.filter(
    (term) => termState(term, workingTermId) === "open",
  );
  const planningTerms = allTerms.filter((term) => {
    const state = termState(term, workingTermId);
    return state === "ready" || state === "draft";
  });
  const expanded =
    expandedSessionIds ??
    new Set(currentSession ? [currentSession.id] : []);
  const toggleSession = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSessionIds(next);
  };

  const refreshDashboard = () =>
    _qc?.invalidateQueries({
      queryKey: _trpc.academics.dashboard.queryKey({}),
    });

  /** Opens a page for a specific term by switching the user's working view first. */
  const openTermPage = async (term: TermWithSession, path: string) => {
    if (auth.profile?.termId !== term.id) {
      await switchSessionTerm({
        termId: term.id,
        sessionId: term.session.id,
        termTitle: term.title,
        sessionTitle: term.session.name,
      });
    }
    router.push(path);
  };

  const editTerm = (term: DashboardTerm) =>
    setMetadataTarget({
      kind: "term",
      id: term.id,
      title: term.title,
      startDate: term.startDate,
      endDate: term.endDate,
      resumptionDate: term.resumptionDate,
      lifecycleStatus:
        term.id === workingTermId ? "ACTIVE" : term.lifecycleStatus,
    });

  const { mutate: closeTerm, isPending: isClosingTerm } = useMutation(
    _trpc.academics.closeTerm.mutationOptions({
      onSuccess() {
        setCloseTermModal(null);
        refreshDashboard();
      },
      meta: {
        toastTitle: {
          error: "Unable to close term",
          loading: "Closing academic term...",
          success: "Academic term closed.",
        },
      },
    }),
  );
  const { mutate: activateTerm, isPending: isActivatingTerm } = useMutation(
    _trpc.academics.activateTerm.mutationOptions({
      async onSuccess(result) {
        setActivateTermModal(null);
        await switchSessionTerm(result);
        await refreshDashboard();
      },
      meta: {
        toastTitle: {
          error: "Unable to activate term",
          loading: "Activating academic term...",
          success: "Working term updated.",
        },
      },
    }),
  );
  const { data: resetPreview, isLoading: isLoadingResetPreview } = useQuery(
    _trpc.academics.previewTermReset.queryOptions(
      { termId: resetTermModal?.id ?? "" },
      { enabled: !!resetTermModal },
    ),
  );
  const { mutate: resetTerm, isPending: isResettingTerm } = useMutation(
    _trpc.academics.resetTerm.mutationOptions({
      onSuccess() {
        setResetTermModal(null);
        setResetConfirmation("");
        refreshDashboard();
      },
      meta: {
        toastTitle: {
          error: "Unable to reset term",
          loading: "Resetting academic term...",
          success: "Academic term reset.",
        },
      },
    }),
  );

  /** The single visible action for each term state. */
  const primaryAction = (term: TermWithSession) => {
    const state = termState(term, workingTermId);
    if (state === "open" && canManageAcademics)
      return (
        <Button size="sm" variant="outline" onClick={() => setCloseTermModal(term)}>
          <Lock data-icon="inline-start" className="size-4" />
          Close term
        </Button>
      );
    if (state === "ready" && canManageAcademics)
      return (
        <Button size="sm" onClick={() => setActivateTermModal(term)}>
          <Play data-icon="inline-start" className="size-4" />
          Activate
        </Button>
      );
    if (state === "draft" && canManageAcademics)
      return (
        <Button size="sm" asChild>
          <Link href={`/academic/term-getting-started/${term.id}`}>
            <Settings data-icon="inline-start" className="size-4" />
            Continue setup
          </Link>
        </Button>
      );
    if (state === "working")
      return (
        <Button size="sm" onClick={() => openTermPage(term, "/academic/assessments")}>
          Open assessments
          <ArrowRight data-icon="inline-end" className="size-4" />
        </Button>
      );
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => openTermPage(term, "/academic/assessments")}
      >
        View
      </Button>
    );
  };

  const workingStats = dashboard?.currentTermStats;
  const workingDay =
    workingTerm?.startDate &&
    differenceInCalendarDays(new Date(), new Date(workingTerm.startDate)) + 1;
  const daysLeft =
    workingTerm?.endDate &&
    differenceInCalendarDays(new Date(workingTerm.endDate), new Date());

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-6">
      <PageTitle>Academic Management</PageTitle>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Academic management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your working term, terms still open, and every session.
          </p>
        </div>
        {canManageAcademics ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setParams({ academicSessionFormType: "session" })}
            >
              <Calendar data-icon="inline-start" className="size-4" />
              New session
            </Button>
            <Button
              disabled={!sessions.length}
              onClick={() =>
                setParams({
                  academicSessionFormType: "term",
                  sessionId: currentSession?.id ?? sessions[0]?.id ?? null,
                })
              }
            >
              <Plus data-icon="inline-start" className="size-4" />
              New term
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {isLoadingDashboard ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : workingTerm ? (
          <Card className="flex flex-col gap-4 p-5" aria-label="Working term">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <StateBadge state="working" />
              <span dir="auto">{workingTerm.session.name}</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold leading-tight">
                <span dir="auto">{workingTerm.title}</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {termDates(workingTerm)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat value={workingTerm.studentCount} label="Students" />
              <Stat value={workingStats?.subjects ?? "—"} label="Subjects" />
              <Stat value={workingStats?.teachers ?? "—"} label="Teachers" />
              <Stat
                value={workingDay ? `Day ${workingDay}` : "—"}
                label={
                  typeof daysLeft === "number"
                    ? `${Math.max(daysLeft, 0)} days left`
                    : "No end date set"
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {primaryAction(workingTerm)}
              {canManageAcademics ? (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/academic/term-getting-started/${workingTerm.id}`}>
                      <Settings data-icon="inline-start" className="size-4" />
                      Configure
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => editTerm(workingTerm)}>
                    <Pencil data-icon="inline-start" className="size-4" />
                    Edit dates
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCloseTermModal(workingTerm)}>
                    Close term
                  </Button>
                </>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-start gap-3 p-5">
            <p className="text-xs text-muted-foreground">No working term</p>
            <h2 className="text-xl font-semibold">Activate a term to start</h2>
            <p className="text-sm text-muted-foreground">
              Set up a term, then activate it so new records default to it.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <Card className="py-1">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
              <h2 className="text-sm font-semibold">Still open</h2>
              <span className="text-xs text-muted-foreground">{openTerms.length}</span>
            </div>
            {openTerms.length ? (
              openTerms.map((term) => (
                <div
                  key={term.id}
                  className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 first-of-type:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <span dir="auto">{term.title}</span>
                      <StateBadge state="open" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Late results and payments allowed · finance ledger{" "}
                      {term.financeLedgerClosed ? "closed" : "open"}
                    </p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => openTermPage(term, "/academic/assessments")}
                    >
                      Enter results
                    </Button>
                    {canManageAcademics ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => setCloseTermModal(term)}
                      >
                        <Lock data-icon="inline-start" className="size-4" />
                        Close term
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 pb-3 text-xs text-muted-foreground">
                Every earlier term is closed.
              </p>
            )}
          </Card>

          <Card className="py-1">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
              <h2 className="text-sm font-semibold">Up next</h2>
              <span className="text-xs text-muted-foreground">{planningTerms.length}</span>
            </div>
            {planningTerms.length ? (
              planningTerms.map((term) => {
                const state = termState(term, workingTermId);
                return (
                  <div
                    key={term.id}
                    className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 first-of-type:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <span dir="auto">{term.title}</span>
                        <StateBadge state={state} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {state === "ready"
                          ? `${term.startDate ? `Starts ${formatDate(term.startDate)} · ` : ""}setup complete`
                          : "Setup not finished"}
                      </p>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      {canManageAcademics ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-destructive sm:flex-none"
                          onClick={() => {
                            setResetConfirmation("");
                            setResetTermModal(term);
                          }}
                        >
                          <RotateCcw data-icon="inline-start" className="size-4" />
                          Reset
                        </Button>
                      ) : null}
                      {primaryAction(term)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-4 pb-1 text-xs text-muted-foreground">
                No term is being prepared.
              </p>
            )}
            {canManageAcademics ? (
              <div className="px-4 pt-1.5 pb-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!sessions.length}
                  onClick={() =>
                    setParams({
                      academicSessionFormType: "term",
                      sessionId: currentSession?.id ?? sessions[0]?.id ?? null,
                    })
                  }
                >
                  <Plus data-icon="inline-start" className="size-4" />
                  New term
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <h2 className="text-sm font-semibold">All sessions</h2>
          <span className="text-xs text-muted-foreground">{sessions.length}</span>
        </div>
        {sessions.map((session) => {
          const isOpen = expanded.has(session.id);
          return (
            <div key={session.id} className="border-t border-border">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                aria-expanded={isOpen}
                onClick={() => toggleSession(session.id)}
              >
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
                <span className="font-semibold" dir="auto">
                  {session.name}
                </span>
                {session.status === "current" ? (
                  <Badge variant="success" className="rounded-full">
                    Current
                  </Badge>
                ) : null}
                <span className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  {session.terms.length} {session.terms.length === 1 ? "term" : "terms"}
                </span>
              </button>
              {isOpen ? (
                <div className="flex flex-col gap-1.5 px-4 pb-3 sm:pl-11">
                  {session.terms.length ? (
                    session.terms.map((term) => {
                      const withSession = { ...term, session };
                      const state = termState(term, workingTermId);
                      return (
                        <div
                          key={term.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2 sm:grid-cols-[minmax(0,1.2fr)_110px_minmax(0,1.4fr)_232px]"
                        >
                          <span className="truncate font-medium">
                            <span dir="auto">{term.title}</span>
                          </span>
                          <span>
                            <StateBadge state={state} />
                          </span>
                          <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
                            {termDates(term)} · {term.studentCount} students
                          </span>
                          <span className="col-span-2 flex justify-end gap-1.5 sm:col-span-1">
                            {canManageAcademics && state !== "closed" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => editTerm(term)}
                              >
                                <Pencil data-icon="inline-start" className="size-4" />
                                Edit
                              </Button>
                            ) : null}
                            {primaryAction(withSession)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                      No terms have been created for this session yet.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {session.status === "current" && promotionIds ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/academic/progression/${promotionIds.lastTermId}/${session.currentTerm?.id}`}
                        >
                          <ArrowUpCircle data-icon="inline-start" className="size-4" />
                          Progress students
                        </Link>
                      </Button>
                    ) : null}
                    {session.id !== auth.profile?.sessionId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!session.terms.some((term) => term.startDate)}
                        onClick={() => {
                          const term = session.terms.find(
                            (candidate) => candidate.startDate !== null,
                          );
                          if (!term) return;
                          switchSessionTerm({
                            termId: term.id,
                            sessionId: session.id,
                            termTitle: term.title,
                            sessionTitle: session.name,
                          }).then(() => window.location.reload());
                        }}
                      >
                        <Check data-icon="inline-start" className="size-4" />
                        Switch to session
                      </Button>
                    ) : null}
                    {canManageAcademics ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setMetadataTarget({
                            kind: "session",
                            id: session.id,
                            title: session.name,
                            startDate: session.startDate,
                            endDate: session.endDate,
                          })
                        }
                      >
                        <Pencil data-icon="inline-start" className="size-4" />
                        Edit session
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>

      <EditAcademicMetadataModal
        target={metadataTarget}
        onOpenChange={(open) => {
          if (!open) setMetadataTarget(null);
        }}
      />
      <AlertDialog
        open={!!closeTermModal}
        onOpenChange={(open) => {
          if (!open) setCloseTermModal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {closeTermModal?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Results, attendance and enrolments become read-only for this
              term. The action is recorded in the activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {closeTermModal && !closeTermModal.financeLedgerClosed ? (
            <div className="flex gap-2.5 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-fg">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                Close the finance ledger for {closeTermModal.title} first.
                Until then the term stays open for late results and payments.
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingTerm}>
              {closeTermModal?.financeLedgerClosed ? "Cancel" : "Not now"}
            </AlertDialogCancel>
            {closeTermModal?.financeLedgerClosed ? (
              <AlertDialogAction
                disabled={isClosingTerm}
                onClick={() => closeTerm({ termId: closeTermModal.id })}
              >
                {isClosingTerm ? "Closing..." : "Close term"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction asChild>
                <Link href="/finance/accounts/close-term">
                  Go to finance close
                </Link>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!activateTermModal}
        onOpenChange={(open) => {
          if (!open) setActivateTermModal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Make {activateTermModal?.title} the working term?
            </AlertDialogTitle>
            <AlertDialogDescription>
              New records default to this term.
              {workingTerm
                ? ` ${workingTerm.title} stays open for late results and payments until you close it.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivatingTerm}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isActivatingTerm}
              onClick={() => {
                if (activateTermModal) activateTerm({ termId: activateTermModal.id });
              }}
            >
              {isActivatingTerm ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!resetTermModal}
        onOpenChange={(open) => {
          if (!open) {
            setResetTermModal(null);
            setResetConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {resetTermModal?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently clears this term&apos;s setup data and returns it
              to an empty draft. Its start and end dates are also removed.
              Active, closed, and financially-used terms cannot be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isLoadingResetPreview ? (
            <p className="text-sm text-muted-foreground">
              Calculating affected records...
            </p>
          ) : resetPreview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
                <span>Subjects</span>
                <strong className="text-right">
                  {resetPreview.counts.subjects}
                </strong>
                <span>Student term sheets</span>
                <strong className="text-right">
                  {resetPreview.counts.students}
                </strong>
                <span>Teacher assignments</span>
                <strong className="text-right">
                  {resetPreview.counts.teachers}
                </strong>
                <span>Attendance sessions</span>
                <strong className="text-right">
                  {resetPreview.counts.attendanceSessions}
                </strong>
                <span>Assessment links/imports</span>
                <strong className="text-right">
                  {resetPreview.counts.assessmentLinks +
                    resetPreview.counts.workbookExports +
                    resetPreview.counts.workbookImports}
                </strong>
              </div>

              {resetPreview.blockers.map((blocker) => (
                <p
                  key={blocker.code}
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {blocker.message}
                </p>
              ))}

              <div className="space-y-2">
                <label
                  htmlFor="term-reset-confirmation"
                  className="text-sm font-medium"
                >
                  Type{" "}
                  <span className="font-mono font-bold">
                    {resetPreview.confirmationText}
                  </span>{" "}
                  to continue
                </label>
                <Input
                  id="term-reset-confirmation"
                  value={resetConfirmation}
                  autoComplete="off"
                  onChange={(event) =>
                    setResetConfirmation(event.target.value)
                  }
                />
              </div>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingTerm}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                isResettingTerm ||
                !resetPreview?.canReset ||
                resetConfirmation !== resetPreview?.confirmationText
              }
              onClick={() => {
                if (
                  resetTermModal &&
                  resetConfirmation === "I APPROVE RESET"
                ) {
                  resetTerm({
                    termId: resetTermModal.id,
                    confirmation: resetConfirmation,
                  });
                }
              }}
            >
              {isResettingTerm ? "Resetting..." : "Reset term"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
