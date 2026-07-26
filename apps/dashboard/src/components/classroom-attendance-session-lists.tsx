"use client";

import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/attendance";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import ConfirmBtn from "./confirm-button";

export type AttendanceSessionListItem = {
  absent: number;
  attendanceDate: Date | string | null;
  attendanceTitle: string;
  id: string;
  late: number;
  periodLabel: string | null;
  present: number;
  rate: number;
  staffName: string | null;
  subjectTitle: string | null;
};

export function AttendanceSessionList({
  isDeleting,
  onDelete,
  onOpen,
  sessions,
}: {
  isDeleting: boolean;
  onDelete?: (attendanceId: string) => void;
  onOpen: (attendanceId: string) => void;
  sessions: AttendanceSessionListItem[];
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="block w-full text-left text-sm md:table">
          <thead className="hidden border-b border-border bg-muted/50 md:table-header-group">
            <tr>
              <th className="px-4 py-3 font-semibold text-foreground">
                Session
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">
                Taken By
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                Present
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                Absent
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Actions
              </th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Rate
              </th>
            </tr>
          </thead>
          <tbody className="block divide-y divide-border md:table-row-group">
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="block cursor-pointer p-4 transition-colors hover:bg-muted/30 md:table-row md:p-0"
                onClick={() => onOpen(session.id)}
              >
                <td className="block p-0 md:table-cell md:px-4 md:py-3">
                  <p className="break-words font-medium text-foreground">
                    {session.attendanceTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground md:mt-0">
                    {session.attendanceDate
                      ? format(new Date(session.attendanceDate), "dd MMM yyyy")
                      : "Unknown date"}
                    {session.subjectTitle ? ` · ${session.subjectTitle}` : ""}
                    {session.periodLabel ? ` · ${session.periodLabel}` : ""}
                  </p>
                </td>
                <td className="mt-3 block p-0 md:mt-0 md:table-cell md:px-4 md:py-3">
                  <p className="text-xs text-muted-foreground md:text-sm">
                    <span className="md:hidden">Taken by </span>
                    {session.staffName || "Unknown staff"}
                  </p>
                </td>
                <td className="mt-3 inline-flex w-1/2 flex-col items-start p-0 md:mt-0 md:table-cell md:w-auto md:px-4 md:py-3 md:text-center">
                  <span className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                    Present
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50/50 text-emerald-600 dark:bg-emerald-900/10"
                  >
                    {session.present + session.late}
                  </Badge>
                </td>
                <td className="mt-3 inline-flex w-1/2 flex-col items-start p-0 md:mt-0 md:table-cell md:w-auto md:px-4 md:py-3 md:text-center">
                  <span className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
                    Absent
                  </span>
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50/50 text-red-500 dark:bg-red-900/10"
                  >
                    {session.absent}
                  </Badge>
                </td>
                <td className="mt-3 inline-block w-1/2 p-0 md:mt-0 md:table-cell md:w-auto md:px-4 md:py-3">
                  <div className="flex items-center gap-1 md:justify-end">
                    {onDelete ? (
                      <ConfirmBtn
                        size="xs"
                        variant="ghost"
                        trash
                        isDeleting={isDeleting}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(session.id);
                        }}
                      />
                    ) : null}
                    <Button
                      size="xs"
                      variant="ghost"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(session.id);
                      }}
                    >
                      Open
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
                <td className="mt-3 inline-block w-1/2 p-0 text-right md:mt-0 md:table-cell md:w-auto md:px-4 md:py-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${session.rate}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {session.rate}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type AttendanceSessionStudent = {
  comment: string | null;
  id: string;
  status: AttendanceStatus;
  studentName: string;
};

export function AttendanceSessionStudentList({
  students,
}: {
  students: AttendanceSessionStudent[];
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="block w-full text-left text-sm md:table">
          <thead className="hidden border-b bg-muted/50 md:table-header-group">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody className="block divide-y md:table-row-group">
            {students.map((student) => {
              const statusLabel =
                ATTENDANCE_STATUSES.find(
                  (status) => status.value === student.status,
                )?.label ?? student.status;

              return (
                <tr
                  key={student.id}
                  className="block space-y-3 p-4 md:table-row md:space-y-0 md:p-0"
                >
                  <td
                    className="block p-0 font-medium md:table-cell md:px-4 md:py-3"
                    dir="auto"
                  >
                    {student.studentName}
                  </td>
                  <td className="block p-0 md:table-cell md:px-4 md:py-3 md:text-center">
                    <Badge variant="outline">{statusLabel}</Badge>
                  </td>
                  <td
                    className="block p-0 text-muted-foreground md:table-cell md:px-4 md:py-3"
                    dir="auto"
                  >
                    {student.comment || "No remark"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
