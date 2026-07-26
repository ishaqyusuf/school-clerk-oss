"use client";

import type { DataDirection } from "@/components/academic-data-direction/provider";
import {
  RECORDABLE_ATTENDANCE_STATUSES,
  allowsAttendanceRemark,
  type AttendanceStatus,
  type RecordableAttendanceStatus,
} from "@/lib/attendance";
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

const ATTENDANCE_STATUS_CODES: Partial<Record<AttendanceStatus, string>> = {
  PRESENT: "P",
  ABSENT: "A",
  LATE: "L",
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
  onStatusChange: (
    attendanceKey: string,
    status: RecordableAttendanceStatus,
  ) => void;
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

  const showRemarksColumn = students.some((student) =>
    allowsAttendanceRemark(statusMap[student.attendanceKey]),
  );

  return (
    <div
      className="min-w-0 overflow-hidden rounded-lg border bg-card"
      dir={direction}
    >
      <div className="overflow-x-auto">
        <table className="block w-full text-start text-sm md:table">
          <thead className="hidden border-b bg-muted/50 md:table-header-group">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {showRemarksColumn ? (
                <th className="px-4 py-3 font-semibold">Remarks</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="block divide-y md:table-row-group">
            {students.map((student) => {
              const selectedStatus = statusMap[student.attendanceKey];
              const showRemark = allowsAttendanceRemark(selectedStatus);
              return (
                <tr
                  key={student.id}
                  className={cn(
                    "block space-y-3 p-4 transition-colors md:table-row md:space-y-0 md:p-0 md:hover:bg-muted/30",
                    selectedStatus &&
                      ATTENDANCE_STATUS_STYLES[selectedStatus]?.row,
                  )}
                >
                  <td
                    className="block p-0 font-medium md:table-cell md:px-4 md:py-3"
                    dir="auto"
                  >
                    {student.studentName}
                  </td>
                  <td className="block p-0 md:table-cell md:min-w-72 md:px-4 md:py-3">
                    <AttendanceStatusPicker
                      selectedStatus={selectedStatus}
                      student={student}
                      onStatusChange={onStatusChange}
                    />
                  </td>
                  {showRemarksColumn ? (
                    <td className="block p-0 md:table-cell md:px-4 md:py-3">
                      {showRemark ? (
                        <Input
                          dir="auto"
                          aria-label={`Remarks for ${student.studentName}`}
                          placeholder="Optional remark (e.g. Sick)"
                          value={commentMap[student.attendanceKey] ?? ""}
                          onChange={(event) =>
                            onCommentChange(
                              student.attendanceKey,
                              event.target.value,
                            )
                          }
                        />
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center gap-2 border-t px-4 py-4 text-center text-sm text-muted-foreground"
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

function AttendanceStatusPicker({
  onStatusChange,
  selectedStatus,
  student,
}: {
  onStatusChange: (
    attendanceKey: string,
    status: RecordableAttendanceStatus,
  ) => void;
  selectedStatus?: AttendanceStatus;
  student: AttendanceRosterStudent;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      dir="ltr"
      value={selectedStatus}
      aria-label={`Attendance status for ${student.studentName}`}
      className="grid w-full grid-cols-3 md:flex md:w-auto"
      onValueChange={(value) => {
        if (!value) return;
        const status = RECORDABLE_ATTENDANCE_STATUSES.find(
          (item) => item.value === value,
        );
        if (status) {
          onStatusChange(student.attendanceKey, status.value);
        }
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
            "w-full px-1 text-xs md:min-w-9 md:w-auto md:px-2",
            ATTENDANCE_STATUS_STYLES[status.value]?.toggle,
          )}
        >
          <span className="md:hidden">{status.label}</span>
          <span className="hidden md:inline">
            {ATTENDANCE_STATUS_CODES[status.value]}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
