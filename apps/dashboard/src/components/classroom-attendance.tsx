"use client";

import { Suspense } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { attendanceRate, downloadAttendanceCsv } from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { TableSkeleton } from "./tables/skeleton";
import {
  Calendar,
  CheckCircle2,
  Download,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { ClassroomAttendanceRecorder } from "./classroom-attendance-form";
import { AttendanceSessionList } from "./classroom-attendance-session-lists";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@school-clerk/ui/tabs";

export function ClassroomAttendance({
  departmentId,
}: {
  departmentId?: string | null;
}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content departmentId={departmentId} />
    </Suspense>
  );
}

function Content({ departmentId }: { departmentId?: string | null }) {
  const { attendanceSessionId, setParams } = useClassroomParams();
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
      sum +
      Math.max(
        session.total - session.excused - session.sick - session.leave,
        0,
      ),
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
  const openAttendanceSession = (attendanceId: string) =>
    setParams({
      attendanceSessionId: attendanceId,
      secondaryTab: "attendance-overview",
    });

  return (
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
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 sm:p-5">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Total Sessions
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-foreground sm:text-3xl">
                    {totalSessions}
                  </h3>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-primary dark:bg-blue-900/20 sm:flex">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {totalStudents} total records
              </p>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-emerald-500/30 sm:p-5">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Average Attended
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-3xl">
                    {avgPresent}%
                  </h3>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 sm:flex">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="hidden items-center text-xs text-emerald-600 dark:text-emerald-400 sm:flex">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> {totalPresent} total
                attended
              </p>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-red-500/30 sm:p-5">
              <div className="mb-2 flex items-start justify-between sm:mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Average Absent
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-red-500 dark:text-red-400 sm:text-3xl">
                    {avgAbsent}%
                  </h3>
                </div>
                <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 sm:flex">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
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
                onClick={() =>
                  downloadAttendanceCsv(
                    (report?.rows ?? []) as Array<Record<string, unknown>>,
                    "classroom-attendance.csv",
                  )
                }
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
              sessions={sessions.map((session) => ({
                ...session,
                rate: Math.round(attendanceRate(session)),
              }))}
              isDeleting={isDeletingSession}
              onDelete={(attendanceId) => deleteSession({ attendanceId })}
              onOpen={openAttendanceSession}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
