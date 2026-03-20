"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "../tables/skeleton";
import { Badge } from "@school-clerk/ui/badge";
import { format } from "date-fns";
import { Card, CardContent } from "@school-clerk/ui/card";
import { CheckCircle2, XCircle, Clock, TrendingUp, Info } from "lucide-react";

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Attendance Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Rate Card */}
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Attendance Rate
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {percentage}%
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                {present} of {total} days
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Days Absent Card */}
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Days Absent
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {absent}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Total school days: {total}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
              <XCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="bg-card rounded-xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {percentage >= 75 ? "Good" : "At Risk"}
              </p>
              <p
                className={`text-xs mt-2 flex items-center gap-1 font-medium ${
                  percentage >= 75
                    ? "text-green-600"
                    : "text-orange-600"
                }`}
              >
                {percentage >= 75
                  ? "Above minimum threshold"
                  : "Needs improvement"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Records Table */}
      <Card className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-base font-semibold text-foreground">
            Recent Activity
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs text-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-5 py-3" scope="col">
                  Date
                </th>
                <th className="px-5 py-3" scope="col">
                  Class
                </th>
                <th className="px-5 py-3" scope="col">
                  Status
                </th>
                <th className="px-5 py-3" scope="col">
                  Session
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => {
                const className = record.department?.classRoom?.name;
                const deptName = record.department?.departmentName;
                const label =
                  className && deptName
                    ? `${className} ${deptName}`
                    : deptName || className || "";
                return (
                  <tr
                    key={record.id}
                    className="bg-card hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      {record.classroomAttendance?.createdAt
                        ? format(
                            new Date(record.classroomAttendance.createdAt),
                            "MMM dd, yyyy"
                          )
                        : record.createdAt
                          ? format(new Date(record.createdAt), "MMM dd, yyyy")
                          : ""}
                    </td>
                    <td className="px-5 py-3">{label}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                          record.isPresent
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                        }`}
                      >
                        {record.isPresent ? "Present" : "Absent"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {record.classroomAttendance?.attendanceTitle ||
                        "Session"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <Info className="text-blue-600 dark:text-blue-400 shrink-0 h-5 w-5 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Note
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
