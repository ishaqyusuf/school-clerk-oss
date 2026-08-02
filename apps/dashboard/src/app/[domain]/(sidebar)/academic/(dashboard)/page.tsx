"use client";
import React from "react";
import {
  Plus,
  Calendar,
  CheckCircle2,
  Settings,
  ArrowUpCircle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Archive,
  RotateCcw,
  Pencil,
  Info,
  Check,
} from "lucide-react";
import { Card } from "@school-clerk/ui/composite";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useAcademicParams } from "@/hooks/use-academic-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
  EditAcademicMetadataModal,
  type AcademicMetadataTarget,
} from "@/components/modals/edit-academic-metadata-modal";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { useAuth } from "@/hooks/use-auth";
import { AcademicSummaryCards } from "@/components/academic/academic-summary-cards";

type DashboardTerm =
  RouterOutputs["academics"]["dashboard"]["sessions"][number]["terms"][number];

const Dashboard = () => {
  const auth = useAuth();
  const canManageAcademics = auth.role === "Admin" || auth.role === "ADMIN";
  const { setParams } = useAcademicParams();
  const [expandedSessionId, setExpandedSessionId] = React.useState<
    string | null
  >(null);
  const [metadataTarget, setMetadataTarget] =
    React.useState<AcademicMetadataTarget | null>(null);
  const [closeTermModal, setCloseTermModal] =
    React.useState<DashboardTerm | null>(null);
  const [resetTermModal, setResetTermModal] =
    React.useState<DashboardTerm | null>(null);
  const [resetConfirmation, setResetConfirmation] = React.useState("");
  const { data: dashboard } = useQuery(
    _trpc.academics.dashboard.queryOptions({}),
  );
  const sessions = dashboard?.sessions || [];
  const promotionIds = dashboard?.promotionIds ?? null;
  const currentSession = sessions.find(
    (session) => session.status === "current",
  );
  const currentTerm = currentSession?.currentTerm ?? null;
  const totalTerms = sessions.reduce(
    (count, session) => count + session.terms.length,
    0,
  );
  const { mutate: closeTerm, isPending: isClosingTerm } = useMutation(
    _trpc.academics.closeTerm.mutationOptions({
      onSuccess() {
        setCloseTermModal(null);
        _qc?.invalidateQueries({
          queryKey: _trpc.academics.dashboard.queryKey({}),
        });
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
        _qc?.invalidateQueries({
          queryKey: _trpc.academics.dashboard.queryKey({}),
        });
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

  return (
    <div className="animate-in fade-in duration-500">
      <PageTitle>Academic Management</PageTitle>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Academic Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure and monitor your school's annual calendars and term
            breakdowns.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 font-bold"
            disabled={!sessions.length}
            onClick={() =>
              setParams({
                academicSessionFormType: "term",
                sessionId: currentSession?.id ?? sessions[0]?.id ?? null,
              })
            }
          >
            <Plus className="h-5 w-5" />
            Create New Term
          </Button>
          <Button
            className="gap-2 font-bold shadow-md shadow-primary/20"
            onClick={() => setParams({ academicSessionFormType: "session" })}
          >
            <Calendar className="h-5 w-5" />
            Create New Session
          </Button>
        </div>
      </div>

      <div className="mb-10">
        <AcademicSummaryCards
          canManageAcademics={canManageAcademics}
          currentSession={currentSession}
          currentTerm={currentTerm}
          sessionCount={sessions.length}
          totalTerms={totalTerms}
          onEdit={setMetadataTarget}
        />
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
          <h3 className="font-bold text-lg">Academic Sessions History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Session Name
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Active Term
                </th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions?.map((session) => (
                <React.Fragment key={session.id}>
                  <tr
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedSessionId(
                        session.id === expandedSessionId ? null : session.id,
                      )
                    }
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {expandedSessionId === session.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div
                          className={`w-2 h-2 rounded-full ${session.status === "current" ? "bg-primary" : session.status === "archived" ? "bg-gray-300" : "bg-yellow-400"}`}
                        ></div>
                        <span className="font-semibold">{session.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge
                        variant={
                          session.status === "current"
                            ? "default"
                            : session.status === "archived"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {session.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      {session.currentTerm ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {session.currentTerm.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {/* Mid-term Break */}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-sm font-medium ${session.status === "planning" ? "italic text-muted-foreground" : ""}`}
                        >
                          {session.activeTerm}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {session.id !== auth.profile?.sessionId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={
                              !session.terms.some((term) => term.startDate)
                            }
                            className="h-8 gap-1.5 px-2 font-semibold"
                            onClick={(event) => {
                              event.stopPropagation();
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
                            <Check data-icon="inline-start" />
                            Switch
                          </Button>
                        ) : null}
                        {canManageAcademics ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 font-semibold"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMetadataTarget({
                                kind: "session",
                                id: session.id,
                                title: session.name,
                                startDate: session.startDate,
                                endDate: session.endDate,
                              });
                            }}
                          >
                            <Pencil data-icon="inline-start" />
                            Edit
                          </Button>
                        ) : null}
                        {session.status === "current" && promotionIds ? (
                          <Link
                            href={`/academic/progression/${promotionIds.lastTermId}/${session.currentTerm?.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-primary font-semibold px-2"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                              Progress
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>

                  {expandedSessionId === session.id && (
                    <>
                      <tr className="bg-muted/20">
                        <td colSpan={4} className="px-6 py-6 lg:px-10">
                          {session.terms.length ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                              {session.terms.map((term) => (
                                <Card
                                  key={term.id}
                                  className="p-4 relative overflow-hidden bg-card/50"
                                >
                                  <div className="absolute top-2 right-2 opacity-10">
                                    <CheckCircle2 className="h-12 w-12" />
                                  </div>
                                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                    {term.title}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wide">
                                    {term.status}
                                  </span>
                                  <div className="mt-4 flex items-center gap-3">
                                    {canManageAcademics &&
                                    term.status !== "closed" ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-0 text-[11px] text-primary font-bold hover:bg-transparent hover:underline"
                                        onClick={() =>
                                          setMetadataTarget({
                                            kind: "term",
                                            id: term.id,
                                            title: term.title,
                                            startDate: term.startDate,
                                            endDate: term.endDate,
                                            lifecycleStatus:
                                              term.id === currentTerm?.id
                                                ? "ACTIVE"
                                                : term.lifecycleStatus,
                                          })
                                        }
                                      >
                                        <Pencil data-icon="inline-start" />
                                        Edit
                                      </Button>
                                    ) : null}
                                    <Link
                                      href={`/academic/term-getting-started/${term.id}`}
                                      className="text-[11px] text-primary font-bold flex items-center gap-1 hover:underline"
                                    >
                                      <Settings /> Configure
                                    </Link>
                                    {term.status === "active" ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-0 text-[11px] text-destructive font-bold hover:bg-transparent hover:underline"
                                        onClick={() => setCloseTermModal(term)}
                                      >
                                        <Archive data-icon="inline-start" />
                                        Close
                                      </Button>
                                    ) : null}
                                    {term.status !== "active" &&
                                    term.status !== "closed" ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-0 text-[11px] text-destructive font-bold hover:bg-transparent hover:underline"
                                        onClick={() => {
                                          setResetConfirmation("");
                                          setResetTermModal(term);
                                        }}
                                      >
                                        <RotateCcw data-icon="inline-start" />
                                        Reset
                                      </Button>
                                    ) : null}
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="animate-in slide-in-from-top-2 duration-200 rounded-lg border border-dashed border-border bg-card/50 px-5 py-6 text-sm text-muted-foreground">
                              No terms have been created for this session yet.
                            </div>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-muted/20 border-t border-border text-xs text-muted-foreground">
          <p>
            Showing {sessions.length} academic{" "}
            {sessions.length === 1 ? "session" : "sessions"}
          </p>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-3 mb-3">
            <Info className="h-5 w-5 text-primary" />
            <h4 className="font-bold text-blue-900 dark:text-blue-300">
              Quick Configuration Tip
            </h4>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
            Setting start and end dates accurately for terms will automatically
            calculate attendance percentages and report card generation periods.
          </p>
        </div>
        <Card className="p-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold mb-1">Session Roll-over</h4>
            <p className="text-xs text-muted-foreground">
              Prepare for the upcoming academic session by copying data.
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary font-bold hover:bg-transparent hover:underline px-0"
            onClick={() => setParams({ academicSessionFormType: "session" })}
          >
            Start Roll-over Wizard
            <ArrowRight data-icon="inline-end" />
          </Button>
        </Card>
      </div>

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
              Academic writes will stop for this term. Its finance ledger must
              already be closed, and the action is recorded in the activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingTerm}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isClosingTerm}
              onClick={() => {
                if (closeTermModal) {
                  closeTerm({ termId: closeTermModal.id });
                }
              }}
            >
              {isClosingTerm ? "Closing..." : "Close term"}
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
