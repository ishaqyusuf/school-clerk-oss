"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { TableSkeleton } from "../tables/skeleton";
import { Badge } from "@school-clerk/ui/badge";
import { format } from "date-fns";

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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-muted-foreground">Present</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-muted-foreground">Absent</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Attendance rate:</span>
        <Badge
          variant="outline"
          className={
            percentage >= 75
              ? "border-green-300 text-green-700"
              : "border-red-300 text-red-600"
          }
        >
          {percentage}%
        </Badge>
      </div>

      <div className="divide-y">
        {records.map((record) => {
          const className = record.department?.classRoom?.name;
          const deptName = record.department?.departmentName;
          const label =
            className && deptName
              ? `${className} ${deptName}`
              : deptName || className || "";
          return (
            <div key={record.id} className="py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {record.classroomAttendance?.attendanceTitle || "Session"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {label && <span>{label} · </span>}
                  {record.classroomAttendance?.createdAt
                    ? format(
                        new Date(record.classroomAttendance.createdAt),
                        "dd MMM yyyy"
                      )
                    : record.createdAt
                    ? format(new Date(record.createdAt), "dd MMM yyyy")
                    : ""}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  record.isPresent
                    ? "border-green-300 text-green-600"
                    : "border-red-300 text-red-500"
                }
              >
                {record.isPresent ? "Present" : "Absent"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
