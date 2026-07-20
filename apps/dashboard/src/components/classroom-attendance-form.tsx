"use client";

import { useClassroomParams } from "@/hooks/use-classroom-params";
import {
  ATTENDANCE_STATUSES,
  type AttendanceScope,
  type AttendanceStatus,
  attendanceRate,
  attendanceRevisionSummary,
  todayAttendanceDate,
} from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Pencil,
  Save,
  User,
  XCircle,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { SubmitButton } from "./submit-button";
import { TableSkeleton } from "./tables/skeleton";

export function ClassroomAttendanceForm() {
  const { secondaryTab, viewClassroomId, attendanceSessionId } =
    useClassroomParams();

  if (
    secondaryTab !== "attendance-form" &&
    secondaryTab !== "attendance-overview"
  ) {
    return null;
  }

  const isOverview = secondaryTab === "attendance-overview";

  return (
    <Sheet.SecondaryContent>
      <Sheet.SecondaryHeader>
        <Sheet.Header className="flex-row items-start gap-4 space-y-0 bg-background">
          <div className="grid gap-2">
            <Sheet.Title>
              {isOverview
                ? "Attendance Session"
                : attendanceSessionId
                  ? "Correct Attendance"
                  : "Take Attendance"}
            </Sheet.Title>
            <Sheet.Description>
              {isOverview
                ? "Review the recorded attendance for this classroom session"
                : "Record general class attendance or a subject lesson register"}
            </Sheet.Description>
          </div>
        </Sheet.Header>
      </Sheet.SecondaryHeader>
      <Sheet.Content>
        <Suspense fallback={<TableSkeleton />}>
          {isOverview ? (
            <AttendanceOverviewContent attendanceId={attendanceSessionId} />
          ) : (
            <AttendanceFormContent
              attendanceId={attendanceSessionId}
              departmentId={viewClassroomId}
            />
          )}
        </Suspense>
      </Sheet.Content>
    </Sheet.SecondaryContent>
  );
}

function AttendanceOverviewContent({
  attendanceId,
}: {
  attendanceId?: string | null;
}) {
  const trpc = useTRPC();
  const { setParams } = useClassroomParams();
  const { data: session } = useSuspenseQuery(
    trpc.attendance.getAttendanceSession.queryOptions(
      { attendanceId: attendanceId || "-" },
      { enabled: !!attendanceId },
    ),
  );

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <div className="border border-dashed p-6 text-sm text-muted-foreground">
          This attendance session could not be found in the active term.
        </div>
        <Sheet.SecondaryFooter>
          <Button
            variant="outline"
            onClick={() =>
              setParams({
                attendanceSessionId: null,
                secondaryTab: null,
              })
            }
          >
            Close
          </Button>
        </Sheet.SecondaryFooter>
      </div>
    );
  }

  const sessionAttendanceRate = attendanceRate(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="border bg-card p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {session.attendanceTitle}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
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
            <Badge variant="outline">{sessionAttendanceRate}% attended</Badge>
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
            {session.sick ? (
              <Badge variant="secondary">{session.sick} sick</Badge>
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

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {session.students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-medium" dir="auto">
                  {student.studentName}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="outline">
                    {ATTENDANCE_STATUSES.find(
                      (status) => status.value === student.status,
                    )?.label ?? student.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground" dir="auto">
                  {student.comment || "No remark"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet.SecondaryFooter>
        <Button
          variant="outline"
          onClick={() =>
            setParams({
              attendanceSessionId: null,
              secondaryTab: null,
            })
          }
        >
          Close
        </Button>
        <Button
          onClick={() =>
            setParams({
              attendanceSessionId: session.id,
              secondaryTab: "attendance-form",
            })
          }
        >
          <Pencil className="mr-2 h-4 w-4" />
          Correct session
        </Button>
      </Sheet.SecondaryFooter>
    </div>
  );
}

function AttendanceFormContent({
  attendanceId,
  departmentId,
}: {
  attendanceId?: string | null;
  departmentId?: string | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams } = useClassroomParams();
  const [title, setTitle] = useState("Daily attendance");
  const [attendanceDate, setAttendanceDate] = useState(todayAttendanceDate);
  const [scope, setScope] = useState<AttendanceScope>("GENERAL");
  const [periodLabel, setPeriodLabel] = useState("");
  const [departmentSubjectId, setDepartmentSubjectId] = useState("");
  const [statusMap, setStatusMap] = useState<
    Record<string, AttendanceStatus | undefined>
  >({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const idempotencyRequestRef = useRef<{
    fingerprint: string;
    key: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: studentsData } = useQuery(
    trpc.students.index.queryOptions(
      { departmentId },
      { enabled: !!departmentId },
    ),
  );
  const { data: options } = useQuery(
    trpc.attendance.getAttendanceOptions.queryOptions(
      { departmentId: departmentId || "-" },
      { enabled: !!departmentId },
    ),
  );
  const { data: editingSession } = useQuery(
    trpc.attendance.getAttendanceSession.queryOptions(
      { attendanceId: attendanceId || "-" },
      { enabled: !!attendanceId },
    ),
  );
  const students = studentsData?.data ?? [];

  useEffect(() => {
    if (!editingSession) return;
    setTitle(editingSession.attendanceTitle);
    setAttendanceDate(
      editingSession.attendanceDate
        ? new Date(editingSession.attendanceDate).toISOString().slice(0, 10)
        : todayAttendanceDate(),
    );
    setScope(editingSession.scope as AttendanceScope);
    setPeriodLabel(editingSession.periodLabel ?? "");
    setDepartmentSubjectId(editingSession.departmentSubjectId ?? "");
    setStatusMap(
      Object.fromEntries(
        editingSession.students
          .filter((student) => student.studentTermFormId)
          .map((student) => [
            student.studentTermFormId!,
            student.status as AttendanceStatus,
          ]),
      ),
    );
    setCommentMap(
      Object.fromEntries(
        editingSession.students
          .filter((student) => student.studentTermFormId)
          .map((student) => [
            student.studentTermFormId!,
            student.comment ?? "",
          ]),
      ),
    );
  }, [editingSession]);

  const roster = useMemo(
    () =>
      students
        .filter((student) => student.termFormId)
        .map((student) => ({
          ...student,
          attendanceKey: student.termFormId!,
        })),
    [students],
  );
  const allStudentsMarked =
    roster.length > 0 &&
    roster.every((student) => Boolean(statusMap[student.attendanceKey]));

  const onSuccess = async () => {
    idempotencyRequestRef.current = null;
    setValidationError(null);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.attendance.getClassroomAttendance.queryKey({
          departmentId: departmentId || "-",
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.attendance.getStudentAttendanceHistory.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.attendance.getAttendanceReport.queryKey(),
      }),
    ]);
    setParams({
      attendanceSessionId: null,
      secondaryTab: null,
    });
  };
  const createMutation = useMutation(
    trpc.attendance.takeAttendance.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Saving attendance...",
          success: "Attendance recorded",
          error: "Failed to save attendance",
        },
      },
      onSuccess,
    }),
  );
  const updateMutation = useMutation(
    trpc.attendance.updateAttendanceSession.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Updating attendance...",
          success: "Attendance updated",
          error: "Failed to update attendance",
        },
      },
      onSuccess,
    }),
  );

  const handleSubmit = () => {
    if (
      !departmentId ||
      !title.trim() ||
      !attendanceDate ||
      !allStudentsMarked ||
      (scope === "SUBJECT" && !departmentSubjectId)
    ) {
      setValidationError(
        !departmentId
          ? "Select a classroom."
          : scope === "SUBJECT" && !departmentSubjectId
            ? "Select a subject for subject attendance."
            : !title.trim()
              ? "Enter a session title."
              : !attendanceDate
                ? "Select an attendance date."
                : "Select a status for every student.",
      );
      return;
    }
    setValidationError(null);
    const payload = {
      attendanceDate,
      attendanceTitle: title.trim(),
      departmentId,
      departmentSubjectId:
        scope === "SUBJECT" ? departmentSubjectId : undefined,
      periodLabel: periodLabel.trim() || undefined,
      scope,
      students: roster.map((student) => ({
        studentTermFormId: student.attendanceKey,
        status: statusMap[student.attendanceKey]!,
        comment: commentMap[student.attendanceKey]?.trim() || undefined,
      })),
    };

    if (attendanceId) {
      updateMutation.mutate({
        ...payload,
        attendanceId,
      });
      return;
    }
    const fingerprint = JSON.stringify(payload);
    if (idempotencyRequestRef.current?.fingerprint !== fingerprint) {
      idempotencyRequestRef.current = {
        fingerprint,
        key: crypto.randomUUID(),
      };
    }
    createMutation.mutate({
      ...payload,
      idempotencyKey: idempotencyRequestRef.current.key,
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Attendance type</Label>
          <Select
            value={scope}
            onValueChange={(value) => {
              const nextScope = value as AttendanceScope;
              setScope(nextScope);
              if (nextScope === "GENERAL") setDepartmentSubjectId("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General class attendance</SelectItem>
              <SelectItem value="SUBJECT">Subject attendance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scope === "SUBJECT" ? (
          <div className="grid gap-2">
            <Label>Subject</Label>
            <Select
              value={departmentSubjectId}
              onValueChange={(value) => {
                setDepartmentSubjectId(value);
                const subject = options?.subjects.find(
                  (item) => item.id === value,
                );
                if (subject && !attendanceId) setTitle(subject.title);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {(options?.subjects ?? []).map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <span dir="auto">{subject.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="attendance-date">Date</Label>
          <Input
            id="attendance-date"
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="attendance-title">Session title</Label>
          <Input
            id="attendance-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Monday morning"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="attendance-period">
          Period or time{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="attendance-period"
          value={periodLabel}
          onChange={(event) => setPeriodLabel(event.target.value)}
          placeholder="e.g. Period 1, Morning, 08:00"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <Label className="text-sm font-medium">Students</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setStatusMap(
                Object.fromEntries(
                  roster.map((student) => [student.attendanceKey, "PRESENT"]),
                ),
              )
            }
          >
            Mark all present
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setStatusMap({})}
          >
            Clear
          </Button>
        </div>
      </div>

      {roster.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No students enrolled in this class for the active term.
        </p>
      ) : (
        <div className="overflow-hidden border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {roster.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium" dir="auto">
                    {student.studentName}
                  </td>
                  <td className="min-w-36 px-4 py-3">
                    <Select
                      value={statusMap[student.attendanceKey]}
                      onValueChange={(value) =>
                        setStatusMap((current) => ({
                          ...current,
                          [student.attendanceKey]: value as AttendanceStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTENDANCE_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      dir="auto"
                      placeholder="Add note"
                      value={commentMap[student.attendanceKey] ?? ""}
                      onChange={(event) =>
                        setCommentMap((current) => ({
                          ...current,
                          [student.attendanceKey]: event.target.value,
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roster.length > 0 && !allStudentsMarked ? (
        <p className="text-sm text-amber-700">
          Select a status for every student before saving.
        </p>
      ) : null}
      {validationError ? (
        <p role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      ) : null}

      <Sheet.SecondaryFooter>
        <Button
          variant="outline"
          type="button"
          onClick={() =>
            setParams({
              attendanceSessionId: null,
              secondaryTab: null,
            })
          }
        >
          Cancel
        </Button>
        <SubmitButton
          isSubmitting={isPending}
          onClick={handleSubmit}
          disabled={isPending}
        >
          <Save className="mr-1 h-4 w-4" />
          {attendanceId ? "Save Correction" : "Save Attendance"}
        </SubmitButton>
      </Sheet.SecondaryFooter>
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
