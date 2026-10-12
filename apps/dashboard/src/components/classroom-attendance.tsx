"use client";

import { Suspense, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useAuth } from "@/hooks/use-auth";
import {
  attendanceRate,
  downloadAttendanceCsv,
  attendanceDateKey,
  todayAttendanceDate,
} from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { TableSkeleton } from "./tables/skeleton";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { ClassroomSectionHeader } from "./classroom-overview/classroom-section-nav";
import {
  ClassroomAttendanceRecorder,
} from "./classroom-attendance-form";
import { AttendanceSessionDialog } from "./attendance-session-dialog";
import { AttendanceSessionList } from "./classroom-attendance-session-lists";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@school-clerk/ui/tabs";

type AttendanceLayout = "tabs" | "workspace";

export function ClassroomAttendance({
  departmentId,
  sessionPresentation = "sheet",
  layout = "tabs",
}: {
  departmentId?: string | null;
  sessionPresentation?: "dialog" | "sheet";
  /**
   * "tabs": Mark attendance / Sessions tabs (teacher workspace).
   * "workspace": classroom sheet page — today + history, recorder on its own page.
   */
  layout?: AttendanceLayout;
}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content
        departmentId={departmentId}
        sessionPresentation={sessionPresentation}
        layout={layout}
      />
    </Suspense>
  );
}

function Content({
  departmentId,
  sessionPresentation,
  layout,
}: {
  departmentId?: string | null;
  sessionPresentation: "dialog" | "sheet";
  layout: AttendanceLayout;
}) {
  const { attendanceSessionId, attendanceView, setParams } =
    useClassroomParams();
  const auth = useAuth();
  const isAdmin = auth.role === "Admin" || auth.role === "ADMIN";
  const [dialogAttendanceSessionId, setDialogAttendanceSessionId] = useState<
    string | null
  >(null);
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data: sessions } = useSuspenseQuery(
    trpc.attendance.getClassroomAttendance.queryOptions(
      { departmentId: departmentId || "-" },
      { enabled: !!departmentId },
    ),
  );
  const { data: report } = useQuery(
    trpc.attendance.getAttendanceReport.queryOptions(
      { departmentId: departmentId || "-" },
      { enabled: !!departmentId },
    ),
  );
  const { mutate: deleteSession, isPending: isDeletingSession } = useMutation(
    trpc.attendance.deleteAttendanceSession.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Deleting attendance session...",
          success: "Attendance session deleted",
          error: "Failed to delete attendance session",
        },
      },
      onSuccess(_, variables) {
        const attendanceId =
          variables && typeof variables === "object"
            ? variables.attendanceId
            : null;
        if (!attendanceId) return;

        qc.invalidateQueries({
          queryKey: trpc.attendance.getClassroomAttendance.queryKey({
            departmentId: departmentId || "-",
          }),
        });
        qc.invalidateQueries({
          queryKey: trpc.attendance.getStudentAttendanceHistory.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.attendance.getAttendanceReport.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.attendance.getAttendanceSession.queryKey({
            attendanceId,
          }),
        });

        if (dialogAttendanceSessionId === attendanceId) {
          setDialogAttendanceSessionId(null);
        }
        if (attendanceSessionId === attendanceId) {
          setParams({
            attendanceSessionId: null,
            secondaryTab: null,
          });
        }
      },
    }),
  );

  const totalSessions = sessions.length;
  const totalStudents = sessions.reduce(
    (sum, session) => sum + session.total,
    0,
  );
  const totalEligibleStudents = sessions.reduce(
    (sum, session) =>
      sum + Math.max(session.total - session.excused - session.leave, 0),
    0,
  );
  const totalPresent = sessions.reduce(
    (sum, session) => sum + session.present + session.late,
    0,
  );
  const totalAbsent = sessions.reduce((sum, s) => sum + s.absent, 0);
  const avgPresent =
    totalEligibleStudents > 0
      ? Math.round((totalPresent / totalEligibleStudents) * 1000) / 10
      : 0;
  const avgAbsent =
    totalEligibleStudents > 0
      ? Math.round((totalAbsent / totalEligibleStudents) * 1000) / 10
      : 0;
  const openAttendanceSession = (nextAttendanceSessionId: string) => {
    if (sessionPresentation === "dialog") {
      setDialogAttendanceSessionId(nextAttendanceSessionId);
      return;
    }

    setParams({
      attendanceSessionId: nextAttendanceSessionId,
      secondaryTab: "attendance-overview",
    });
  };

  const sessionRows = sessions.map((session) => ({
    absent: session.absent,
    attendanceDate: session.attendanceDate,
    attendanceTitle: session.attendanceTitle,
    id: session.id,
    late: session.late,
    periodLabel: session.periodLabel,
    present: session.present,
    rate: Math.round(attendanceRate(session)),
    staffName: session.staffName,
    subjectTitle: session.subjectTitle,
  }));
  const exportCsv = () =>
    downloadAttendanceCsv(
      (report?.rows ?? []) as Array<Record<string, unknown>>,
      "classroom-attendance.csv",
    );

  if (layout === "workspace") {
    if (attendanceView === "take") {
      return (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Button
              variant="link"
              size="sm"
              className="h-auto w-fit gap-1 p-0 text-muted-foreground"
              onClick={() => setParams({ attendanceView: null })}
            >
              <ArrowLeft className="size-3.5" />
              Attendance
            </Button>
            <ClassroomSectionHeader title="Take attendance" />
          </div>
          <ClassroomAttendanceRecorder departmentId={departmentId} />
        </div>
      );
    }
    const today = todayAttendanceDate();
    const todaysSessions = sessions.filter(
      (session) => attendanceDateKey(session.attendanceDate) === today,
    );
    const todayLabel = new Date(`${today}T00:00:00`).toLocaleDateString(
      undefined,
      { weekday: "short", day: "numeric", month: "short" },
    );
    const takeAttendance = () => setParams({ attendanceView: "take" });
    return (
      <div className="flex min-w-0 flex-col gap-5">
        <ClassroomSectionHeader
          title="Attendance"
          description={
            totalSessions
              ? `${totalSessions} session${totalSessions === 1 ? "" : "s"} this term · ${avgPresent}% attended · ${avgAbsent}% absent`
              : "No sessions recorded this term"
          }
          actions={
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!report?.rows.length}
              onClick={exportCsv}
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          }
        />
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={
                todaysSessions.length
                  ? "rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "rounded-md bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }
            >
              {todaysSessions.length ? (
                <CalendarCheck className="size-5" />
              ) : (
                <Calendar className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Today · {todayLabel}</p>
              <p className="truncate text-sm text-muted-foreground">
                {todaysSessions.length
                  ? todaysSessions
                      .map(
                        (session) =>
                          `${session.attendanceTitle || "Attendance"}: ${session.present + session.late} present, ${session.absent} absent`,
                      )
                      .join(" · ")
                  : "Not taken yet"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={todaysSessions.length ? "outline" : "default"}
            className="gap-2"
            onClick={takeAttendance}
          >
            <ClipboardCheck className="size-4" />
            {todaysSessions.length ? "Take another" : "Take attendance"}
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Sessions</h3>
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No attendance records yet. Take attendance to create the first
              session.
            </div>
          ) : (
            <AttendanceSessionList
              sessions={sessionRows}
              isDeleting={isDeletingSession}
              onDelete={
                isAdmin
                  ? (attendanceId) => deleteSession({ attendanceId })
                  : undefined
              }
              onOpen={openAttendanceSession}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        <Tabs
          defaultValue="attendance"
          className="flex min-w-0 flex-col gap-4 sm:gap-5"
        >
        <TabsList className="grid h-auto min-w-0 w-full grid-cols-2 rounded-none border bg-muted/40 p-1">
          <TabsTrigger value="attendance" className="rounded-none py-2">
            Mark attendance
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-none py-2">
            Sessions
            {totalSessions ? (
              <Badge variant="outline" className="ml-2 h-5 px-1.5 text-[11px]">
                {totalSessions}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-0">
          <ClassroomAttendanceRecorder departmentId={departmentId} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-0 flex flex-col gap-6">
          {/* Stats Grid */}
          <div data-summary-grid className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 sm:p-5">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p data-summary-label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Total Sessions
                  </p>
                  <h3 data-summary-value className="mt-1 text-xl font-bold text-foreground sm:text-3xl">
                    {totalSessions}
                  </h3>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-primary dark:bg-blue-900/20 sm:flex">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <p data-summary-label className="hidden text-xs text-muted-foreground sm:block">
                {totalStudents} total records
              </p>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-emerald-500/30 sm:p-5">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p data-summary-label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Average Attended
                  </p>
                  <h3 data-summary-value className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-3xl">
                    {avgPresent}%
                  </h3>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 sm:flex">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p data-summary-label className="hidden items-center text-xs text-emerald-600 dark:text-emerald-400 sm:flex">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> {totalPresent} total
                attended
              </p>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-red-500/30 sm:p-5">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p data-summary-label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Average Absent
                  </p>
                  <h3 data-summary-value className="mt-1 text-xl font-bold text-red-500 dark:text-red-400 sm:text-3xl">
                    {avgAbsent}%
                  </h3>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 sm:flex">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
              <p data-summary-label className="hidden text-xs text-muted-foreground sm:block">
                {totalAbsent} total absent
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Attendance Sessions
            </h3>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!report?.rows.length}
                onClick={exportCsv}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Sessions Table */}
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <span>No attendance records yet.</span>
              <span>Open Mark attendance to create the first session.</span>
            </div>
          ) : (
            <AttendanceSessionList
              sessions={sessionRows}
              isDeleting={isDeletingSession}
              onDelete={(attendanceId) => deleteSession({ attendanceId })}
              onOpen={openAttendanceSession}
            />
          )}
        </TabsContent>
        </Tabs>
      </div>
      {sessionPresentation === "dialog" ? (
        <AttendanceSessionDialog
          key={dialogAttendanceSessionId ?? "closed"}
          attendanceId={dialogAttendanceSessionId}
          departmentId={departmentId}
          onClose={() => setDialogAttendanceSessionId(null)}
        />
      ) : null}
    </>
  );
}
