"use client";

import { Suspense, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "../tables/skeleton";
import { format, getDaysInMonth, getDay, startOfMonth } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Info,
} from "lucide-react";

export function StudentAttendanceHistory() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const { studentViewId } = useStudentParams();
  const trpc = useTRPC();
  const { data: records } = useSuspenseQuery(
    trpc.attendance.getStudentAttendanceHistory.queryOptions(
      { studentId: studentViewId },
      { enabled: !!studentViewId }
    )
  );

  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <span>No attendance records found.</span>
      </div>
    );
  }

  const total = records.length;
  const present = records.filter((r) => r.isPresent).length;
  const absent = total - present;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Attendance Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {percentage}%
            </p>
            {percentage >= 75 ? (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                Good standing
              </p>
            ) : (
              <p className="text-xs text-red-500 mt-2 font-medium">
                Needs improvement
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Days Present
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">{present}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Total school days: {total}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Days Absent
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">{absent}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {absent === 0
                ? "Perfect attendance"
                : `${absent} day${absent > 1 ? "s" : ""} missed`}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs text-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    Date
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Session
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Status
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((record) => {
                  const dateStr =
                    record.classroomAttendance?.createdAt ||
                    record.createdAt;
                  const dateLabel = dateStr
                    ? format(new Date(dateStr), "MMM dd, yyyy")
                    : "";
                  const dayLabel = dateStr
                    ? format(new Date(dateStr), "EEEE")
                    : "";
                  const className = record.department?.classRoom?.name;
                  const deptName = record.department?.departmentName;
                  const sessionLabel =
                    record.classroomAttendance?.attendanceTitle || "Session";

                  return (
                    <tr
                      key={record.id}
                      className="bg-card hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">
                          {dateLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dayLabel}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{sessionLabel}</p>
                        {(className || deptName) && (
                          <p className="text-xs text-muted-foreground">
                            {className && deptName
                              ? `${className} ${deptName}`
                              : deptName || className}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {record.isPresent ? (
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Present
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium px-2.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground/60">
                        {record.comment || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Overview Calendar */}
        <MonthlyOverview records={records} />
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <Info className="text-blue-600 dark:text-blue-400 shrink-0 h-5 w-5 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Term Note
          </h4>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            Attendance data is automatically synchronized from the classroom
            register. If you notice a discrepancy, please contact the class
            teacher.
          </p>
        </div>
      </div>
    </div>
  );
}

function MonthlyOverview({
  records,
}: {
  records: Array<{
    id: string;
    isPresent: boolean;
    createdAt: Date | string | null;
    classroomAttendance: {
      createdAt: Date | string | null;
    } | null;
  }>;
}) {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  const { monthLabel, calendarDays } = useMemo(() => {
    const now = new Date();
    const label = format(now, "MMMM yyyy");
    const daysInMonth = getDaysInMonth(now);
    const firstDayOfWeek = getDay(startOfMonth(now));

    const attendanceMap = new Map<number, boolean>();
    records.forEach((r) => {
      const dateStr = r.classroomAttendance?.createdAt || r.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        ) {
          attendanceMap.set(d.getDate(), r.isPresent);
        }
      }
    });

    const days: Array<{
      day: number | null;
      status: "present" | "absent" | "none" | "empty";
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, status: "empty" });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (attendanceMap.has(d)) {
        days.push({
          day: d,
          status: attendanceMap.get(d) ? "present" : "absent",
        });
      } else {
        days.push({ day: d, status: isWeekend ? "empty" : "none" });
      }
    }

    return { monthLabel: label, calendarDays: days };
  }, [records]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Monthly Overview
      </h3>
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {monthLabel}
          </span>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-emerald-500" /> Present
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-red-400" /> Absent
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dayLabels.map((d, i) => (
            <div
              key={i}
              className="text-center text-xs text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
          {calendarDays.map((cell, i) => {
            if (cell.status === "empty" || cell.day === null) {
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md bg-secondary/50 flex items-center justify-center text-xs text-muted-foreground"
                >
                  {cell.day}
                </div>
              );
            }
            if (cell.status === "present") {
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-medium"
                >
                  {cell.day}
                </div>
              );
            }
            if (cell.status === "absent") {
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-700 dark:text-red-400 text-xs font-medium ring-1 ring-red-200 dark:ring-red-800"
                >
                  {cell.day}
                </div>
              );
            }
            return (
              <div
                key={i}
                className="aspect-square rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-xs"
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
