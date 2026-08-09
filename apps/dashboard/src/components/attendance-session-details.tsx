"use client";

import { useClassroomParams } from "@/hooks/use-classroom-params";
import {
  attendanceRate,
  attendanceRevisionSummary,
} from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import Sheet from "@school-clerk/ui/custom/sheet";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Pencil,
  User,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { AttendanceSessionStudentList } from "./classroom-attendance-session-lists";

type AttendanceSessionDetailsProps = {
  attendanceId?: string | null;
} & (
  | {
      presentation: "sheet";
    }
  | {
      presentation: "dialog";
      onClose: () => void;
      onCorrect: () => void;
    }
);

export function AttendanceSessionDetails(
  props: AttendanceSessionDetailsProps,
) {
  const trpc = useTRPC();
  const { setParams } = useClassroomParams();
  const { data: session } = useSuspenseQuery(
    trpc.attendance.getAttendanceSession.queryOptions(
      { attendanceId: props.attendanceId || "-" },
      { enabled: !!props.attendanceId },
    ),
  );
  const close = () => {
    if (props.presentation === "dialog") {
      props.onClose();
      return;
    }
    setParams({
      attendanceSessionId: null,
      secondaryTab: null,
    });
  };

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <div className="border border-dashed p-6 text-sm text-muted-foreground">
          This attendance session could not be found in the active term.
        </div>
        <AttendanceSessionFooter presentation={props.presentation}>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
        </AttendanceSessionFooter>
      </div>
    );
  }

  const correct = () => {
    if (props.presentation === "dialog") {
      props.onCorrect();
      return;
    }
    setParams({
      attendanceSessionId: session.id,
      secondaryTab: "attendance-form",
    });
  };
  const sessionAttendanceRate = attendanceRate(session);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <div className="min-w-0 border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              <h3 className="break-words text-lg font-semibold">
                {session.attendanceTitle}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {session.attendanceDate
                    ? format(new Date(session.attendanceDate), "dd MMM yyyy")
                    : "Unknown date"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {session.staffName || "Unknown staff"}
                </span>
                {session.subjectTitle ? (
                  <span dir="auto">{session.subjectTitle}</span>
                ) : null}
                {session.periodLabel ? (
                  <span>{session.periodLabel}</span>
                ) : null}
              </div>
            </div>
            <Badge variant="outline" className="w-fit shrink-0">
              {sessionAttendanceRate}% attended
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Students" value={session.total} tone="default" />
            <StatCard label="Present" value={session.present} tone="success" />
            <StatCard label="Late" value={session.late} tone="warning" />
            <StatCard label="Absent" value={session.absent} tone="danger" />
          </div>
          <div className="flex flex-wrap gap-2">
            {session.excused ? (
              <Badge variant="secondary">{session.excused} excused</Badge>
            ) : null}
            {session.leave ? (
              <Badge variant="secondary">{session.leave} on leave</Badge>
            ) : null}
          </div>
          {session.revisionHistory.length ? (
            <div className="border-t pt-3">
              <p className="text-sm font-medium">Revision history</p>
              <div className="mt-2 space-y-2">
                {session.revisionHistory.map((revision) => (
                  <div
                    key={revision.id}
                    className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
                  >
                    <span>
                      {revision.action.toLowerCase()} by{" "}
                      {revision.actorName || "School Clerk user"}
                    </span>
                    <span>{format(new Date(revision.createdAt), "PPp")}</span>
                    <p className="w-full">
                      {attendanceRevisionSummary(revision.snapshot)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AttendanceSessionStudentList students={session.students} />

      <AttendanceSessionFooter presentation={props.presentation}>
        <Button variant="outline" onClick={close}>
          Close
        </Button>
        <Button onClick={correct}>
          <Pencil className="mr-2 h-4 w-4" />
          Correct session
        </Button>
      </AttendanceSessionFooter>
    </div>
  );
}

function AttendanceSessionFooter({
  children,
  presentation,
}: {
  children: ReactNode;
  presentation: "dialog" | "sheet";
}) {
  if (presentation === "sheet") {
    return <Sheet.SecondaryFooter>{children}</Sheet.SecondaryFooter>;
  }

  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "danger";
}) {
  const toneClassName =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-500"
          : "text-foreground";
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : User;

  return (
    <div className="border bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-semibold ${toneClassName}`}>
            {value}
          </p>
        </div>
        <Icon className={`h-5 w-5 ${toneClassName}`} />
      </div>
    </div>
  );
}
