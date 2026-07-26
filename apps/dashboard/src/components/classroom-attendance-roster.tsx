"use client";

import type { DataDirection } from "@/components/academic-data-direction/provider";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/attendance";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { Spinner } from "@school-clerk/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { toast } from "@school-clerk/ui/use-toast";
import type { RefCallback } from "react";

type AttendanceRosterStudent = {
  attendanceKey: string;
  id: string;
  studentName: string;
};

const RECORDABLE_ATTENDANCE_STATUSES = ATTENDANCE_STATUSES.filter((status) =>
  ["PRESENT", "ABSENT", "LATE", "SICK"].includes(status.value),
);

const ATTENDANCE_STATUS_CODES: Partial<Record<AttendanceStatus, string>> = {
  PRESENT: "P",
  ABSENT: "A",
  LATE: "L",
  SICK: "S",
};

const ATTENDANCE_STATUS_STYLES: Partial<
  Record<AttendanceStatus, { row: string; toggle: string }>
> = {
  PRESENT: {
    row: "bg-emerald-50/40 dark:bg-emerald-950/10",
    toggle:
      "data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-500 data-[state=on]:text-white",
  },
  ABSENT: {
    row: "bg-red-50/50 dark:bg-red-950/10",
    toggle:
      "data-[state=on]:border-red-500 data-[state=on]:bg-red-500 data-[state=on]:text-white",
  },
  LATE: {
    row: "bg-amber-50/50 dark:bg-amber-950/10",
    toggle:
      "data-[state=on]:border-amber-500 data-[state=on]:bg-amber-400 data-[state=on]:text-amber-950",
  },
  SICK: {
    row: "bg-blue-50/50 dark:bg-blue-950/10",
    toggle:
      "data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500 data-[state=on]:text-white",
  },
};

export function ClassroomAttendanceRoster({
  commentMap,
  direction,
  hasMore,
  isError,
  isLoading,
  loadMoreRef,
  onCommentChange,
  onStatusChange,
  statusMap,
  students,
  total,
}: {
  commentMap: Record<string, string>;
  direction: DataDirection;
  hasMore: boolean;
  isError: boolean;
  isLoading: boolean;
  loadMoreRef: RefCallback<HTMLDivElement>;
  onCommentChange: (attendanceKey: string, comment: string) => void;
  onStatusChange: (attendanceKey: string, status: AttendanceStatus) => void;
  statusMap: Record<string, AttendanceStatus | undefined>;
  students: AttendanceRosterStudent[];
  total: number;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        Loading the complete classroom roster…
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="py-4 text-center text-sm text-destructive">
        The classroom roster could not be loaded. Try again.
      </p>
    );
  }

  if (total === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No students enrolled in this class for the active term.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border bg-card" dir={direction}>
      <table className="w-full text-start text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Student</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {students.map((student) => {
            const selectedStatus = statusMap[student.attendanceKey];
            return (
              <tr
                key={student.id}
                className={cn(
                  "transition-colors hover:bg-muted/30",
                  selectedStatus &&
                    ATTENDANCE_STATUS_STYLES[selectedStatus]?.row,
                )}
              >
                <td className="px-4 py-3 font-medium" dir="auto">
                  {student.studentName}
                </td>
                <td className="min-w-72 px-4 py-3">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    dir="ltr"
                    value={selectedStatus}
                    aria-label={`Attendance status for ${student.studentName}`}
                    onValueChange={(value) => {
                      if (!value) return;
                      const status = RECORDABLE_ATTENDANCE_STATUSES.find(
                        (item) => item.value === value,
                      );
                      onStatusChange(
                        student.attendanceKey,
                        value as AttendanceStatus,
                      );
                      if (status) toast({ title: status.label });
                    }}
                  >
                    {RECORDABLE_ATTENDANCE_STATUSES.map((status) => (
                      <ToggleGroupItem
                        key={status.value}
                        value={status.value}
                        aria-label={status.label}
                        title={status.label}
                        className={cn(
                          "min-w-9 px-2",
                          ATTENDANCE_STATUS_STYLES[status.value]?.toggle,
                        )}
                      >
                        {ATTENDANCE_STATUS_CODES[status.value]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </td>
                <td className="px-4 py-3">
                  <Input
                    dir="auto"
                    placeholder="Add note"
                    value={commentMap[student.attendanceKey] ?? ""}
                    onChange={(event) =>
                      onCommentChange(student.attendanceKey, event.target.value)
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasMore ? (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center gap-2 border-t py-4 text-sm text-muted-foreground"
        >
          <Spinner />
          Loading more students… {students.length} of {total}
        </div>
      ) : (
        <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
          All {total} students loaded
        </p>
      )}
    </div>
  );
}
