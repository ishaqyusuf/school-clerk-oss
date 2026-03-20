"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { TableSkeleton } from "./tables/skeleton";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";

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
  const { setParams } = useClassroomParams();
  const trpc = useTRPC();
  const { data: sessions } = useSuspenseQuery(
    trpc.attendance.getClassroomAttendance.queryOptions(
      { departmentId: departmentId || "-" },
      { enabled: !!departmentId }
    )
  );

  const totalSessions = sessions.length;
  const totalStudents = sessions.reduce((sum, s) => sum + s.total, 0);
  const totalPresent = sessions.reduce((sum, s) => sum + s.present, 0);
  const totalAbsent = sessions.reduce((sum, s) => sum + s.absent, 0);
  const avgPresent =
    totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 1000) / 10 : 0;
  const avgAbsent =
    totalStudents > 0 ? Math.round((totalAbsent / totalStudents) * 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </p>
              <h3 className="text-3xl font-bold text-foreground mt-1">
                {totalSessions}
              </h3>
            </div>
            <div className="h-10 w-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalStudents} total records
          </p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Present
              </p>
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {avgPresent}%
              </h3>
            </div>
            <div className="h-10 w-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> {totalPresent} total
            present
          </p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-red-500/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Average Absent
              </p>
              <h3 className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">
                {avgAbsent}%
              </h3>
            </div>
            <div className="h-10 w-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalAbsent} total absent
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Attendance Sessions
        </h3>
        <Button
          size="xs"
          onClick={() => setParams({ secondaryTab: "attendance-form" })}
        >
          Take Attendance
        </Button>
      </div>

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <span>No attendance records yet.</span>
          <span>Click &quot;Take Attendance&quot; to record a session.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">
                  Session
                </th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">
                  Present
                </th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">
                  Absent
                </th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => {
                const rate =
                  session.total > 0
                    ? Math.round((session.present / session.total) * 100)
                    : 0;
                return (
                  <tr
                    key={session.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {session.attendanceTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.createdAt
                          ? format(
                              new Date(session.createdAt),
                              "dd MMM yyyy"
                            )
                          : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10"
                      >
                        {session.present}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className="text-red-500 border-red-200 bg-red-50/50 dark:bg-red-900/10"
                      >
                        {session.absent}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
