"use client";

import {
  resolveRosterDataDirection,
  useAcademicDataDirection,
} from "@/components/academic-data-direction/provider";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import {
  type AttendanceScope,
  type AttendanceStatus,
  attendanceFormDetailsSchema,
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
import { toast } from "@school-clerk/ui/use-toast";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Pencil,
  Save,
  User,
  XCircle,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ClassroomAttendanceRoster } from "./classroom-attendance-roster";
import { AttendanceSessionStudentList } from "./classroom-attendance-session-lists";
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

export function ClassroomAttendanceRecorder({
  departmentId,
}: {
  departmentId?: string | null;
}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <AttendanceFormContent departmentId={departmentId} inline />
    </Suspense>
  );
}

const ROSTER_RENDER_BATCH_SIZE = 25;

type AttendanceFieldErrors = Partial<
  Record<
    "attendanceDate" | "attendanceTitle" | "departmentSubjectId" | "roster",
    string
  >
>;

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

      <AttendanceSessionStudentList students={session.students} />

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
  inline = false,
}: {
  attendanceId?: string | null;
  departmentId?: string | null;
  inline?: boolean;
}) {
  const academicDataDirection = useAcademicDataDirection();
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
  const [fieldErrors, setFieldErrors] = useState<AttendanceFieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [visibleRosterCount, setVisibleRosterCount] = useState(
    ROSTER_RENDER_BATCH_SIZE,
  );
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({
    rootMargin: "400px",
  });

  const {
    data: rosterData,
    isError: isRosterError,
    isLoading: isRosterLoading,
  } = useQuery(
    trpc.attendance.getAttendanceRoster.queryOptions(
      { departmentId: departmentId || "-" },
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

  useEffect(() => {
    if (attendanceId) return;

    idempotencyRequestRef.current = null;
    setTitle("Daily attendance");
    setAttendanceDate(todayAttendanceDate());
    setScope("GENERAL");
    setPeriodLabel("");
    setDepartmentSubjectId("");
    setStatusMap({});
    setCommentMap({});
    setFieldErrors({});
    setSubmissionError(null);
    setVisibleRosterCount(ROSTER_RENDER_BATCH_SIZE);
  }, [attendanceId, departmentId]);

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
      (rosterData?.students ?? []).map((student) => ({
        ...student,
        attendanceKey: student.studentTermFormId,
      })),
    [rosterData?.students],
  );
  const visibleRoster = useMemo(
    () => roster.slice(0, visibleRosterCount),
    [roster, visibleRosterCount],
  );
  const hasMoreRoster = visibleRoster.length < roster.length;

  useEffect(() => {
    if (!loadMoreInView || !hasMoreRoster) return;

    setVisibleRosterCount((current) =>
      Math.min(current + ROSTER_RENDER_BATCH_SIZE, roster.length),
    );
  }, [hasMoreRoster, loadMoreInView, roster.length, visibleRoster.length]);

  const rosterDirection = useMemo(
    () =>
      resolveRosterDataDirection(
        roster.map((student) => student.studentName),
        academicDataDirection,
      ),
    [academicDataDirection, roster],
  );
  const allStudentsMarked =
    roster.length > 0 &&
    roster.every((student) => Boolean(statusMap[student.attendanceKey]));

  const onSuccess = async () => {
    idempotencyRequestRef.current = null;
    setFieldErrors({});
    setSubmissionError(null);
    if (inline) {
      setStatusMap({});
      setCommentMap({});
    }
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
      onError(error) {
        setSubmissionError(error.message);
      },
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
      onError(error) {
        setSubmissionError(error.message);
      },
    }),
  );

  const handleSubmit = () => {
    const details = attendanceFormDetailsSchema.safeParse({
      attendanceDate,
      attendanceTitle: title,
      departmentId: departmentId ?? "",
      departmentSubjectId,
      scope,
    });

    const nextFieldErrors: AttendanceFieldErrors = {};
    if (!details.success) {
      for (const issue of details.error.issues) {
        const field = issue.path[0];
        if (
          field === "attendanceDate" ||
          field === "attendanceTitle" ||
          field === "departmentSubjectId"
        ) {
          nextFieldErrors[field] ??= issue.message;
        } else if (field === "departmentId") {
          nextFieldErrors.roster ??= issue.message;
        }
      }
    }
    if (isRosterLoading) {
      nextFieldErrors.roster =
        "Wait for the complete classroom roster to load.";
    } else if (isRosterError) {
      nextFieldErrors.roster =
        "The classroom roster could not be loaded. Try again.";
    } else if (!allStudentsMarked) {
      nextFieldErrors.roster = "Select a status for every student.";
    }

    setFieldErrors(nextFieldErrors);
    if (!details.success || Object.keys(nextFieldErrors).length > 0) {
      return;
    }
    setSubmissionError(null);
    const payload = {
      attendanceDate: details.data.attendanceDate,
      attendanceTitle: details.data.attendanceTitle,
      departmentId: details.data.departmentId,
      departmentSubjectId:
        details.data.scope === "SUBJECT"
          ? details.data.departmentSubjectId
          : undefined,
      periodLabel: periodLabel.trim() || undefined,
      scope: details.data.scope,
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
  const isSaveDisabled = isPending || isRosterLoading || isRosterError;
  const shiftAttendanceDate = (days: number) => {
    const currentDate = new Date(`${attendanceDate}T12:00:00`);
    setAttendanceDate(format(addDays(currentDate, days), "yyyy-MM-dd"));
    setFieldErrors((current) => ({
      ...current,
      attendanceDate: undefined,
    }));
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Attendance type</Label>
          <Select
            value={scope}
            onValueChange={(value) => {
              const nextScope = value as AttendanceScope;
              setScope(nextScope);
              if (nextScope === "GENERAL") {
                setDepartmentSubjectId("");
                setFieldErrors((current) => ({
                  ...current,
                  departmentSubjectId: undefined,
                }));
              }
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
        <div className="grid gap-2">
          <Label htmlFor="attendance-title">Session title</Label>
          <Input
            id="attendance-title"
            value={title}
            aria-invalid={Boolean(fieldErrors.attendanceTitle)}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((current) => ({
                ...current,
                attendanceTitle: undefined,
              }));
            }}
            placeholder="e.g. Monday morning"
          />
          {fieldErrors.attendanceTitle ? (
            <p className="text-sm text-destructive">
              {fieldErrors.attendanceTitle}
            </p>
          ) : null}
        </div>
      </div>
      {scope === "SUBJECT" ? (
        <div className="grid gap-2">
          <Label>Subject</Label>
          <Select
            value={departmentSubjectId}
            onValueChange={(value) => {
              setDepartmentSubjectId(value);
              setFieldErrors((current) => ({
                ...current,
                departmentSubjectId: undefined,
              }));
              const subject = options?.subjects.find(
                (item) => item.id === value,
              );
              if (subject && !attendanceId) setTitle(subject.title);
            }}
          >
            <SelectTrigger
              aria-invalid={Boolean(fieldErrors.departmentSubjectId)}
            >
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
          {fieldErrors.departmentSubjectId ? (
            <p className="text-sm text-destructive">
              {fieldErrors.departmentSubjectId}
            </p>
          ) : null}
        </div>
      ) : null}
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

      <div className="sticky top-0 z-10 flex min-w-0 flex-col gap-3 border-y bg-background/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 items-center sm:w-auto">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 rounded-r-none"
            aria-label="Previous attendance date"
            onClick={() => shiftAttendanceDate(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            id="attendance-date"
            aria-label="Attendance date"
            type="date"
            value={attendanceDate}
            aria-invalid={Boolean(fieldErrors.attendanceDate)}
            onChange={(event) => {
              setAttendanceDate(event.target.value);
              setFieldErrors((current) => ({
                ...current,
                attendanceDate: undefined,
              }));
            }}
            className="min-w-0 flex-1 rounded-none border-x-0 text-center sm:w-40 sm:flex-none"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 rounded-l-none"
            aria-label="Next attendance date"
            onClick={() => shiftAttendanceDate(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <span className="col-span-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:col-auto">
            Mark all
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isRosterLoading || isRosterError || roster.length === 0}
            onClick={() => {
              setStatusMap(
                Object.fromEntries(
                  roster.map((student) => [student.attendanceKey, "PRESENT"]),
                ),
              );
              setFieldErrors((current) => ({
                ...current,
                roster: undefined,
              }));
              toast({ title: "Present" });
            }}
          >
            Present
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => setStatusMap({})}
          >
            Clear
          </Button>
          {inline ? (
            <SubmitButton
              isSubmitting={isPending}
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              className="col-span-2 w-full sm:w-auto"
            >
              <Save className="mr-1 size-4" />
              Save attendance
            </SubmitButton>
          ) : null}
        </div>
      </div>
      {fieldErrors.attendanceDate ? (
        <p className="text-sm text-destructive">{fieldErrors.attendanceDate}</p>
      ) : null}

      <ClassroomAttendanceRoster
        commentMap={commentMap}
        direction={rosterDirection}
        hasMore={hasMoreRoster}
        isError={isRosterError}
        isLoading={isRosterLoading}
        loadMoreRef={loadMoreRef}
        onCommentChange={(attendanceKey, comment) =>
          setCommentMap((current) => ({
            ...current,
            [attendanceKey]: comment,
          }))
        }
        onStatusChange={(attendanceKey, status) => {
          setStatusMap((current) => ({
            ...current,
            [attendanceKey]: status,
          }));
          setFieldErrors((current) => ({
            ...current,
            roster: undefined,
          }));
        }}
        statusMap={statusMap}
        students={visibleRoster}
        total={roster.length}
      />

      {roster.length > 0 && !allStudentsMarked ? (
        <p className="text-sm text-amber-700">
          Select a status for every student before saving.
        </p>
      ) : null}
      {fieldErrors.roster ? (
        <p role="alert" className="text-sm text-destructive">
          {fieldErrors.roster}
        </p>
      ) : null}
      {submissionError ? (
        <p role="alert" className="text-sm text-destructive">
          {submissionError}
        </p>
      ) : null}

      {!inline ? (
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
            disabled={isSaveDisabled}
          >
            <Save className="mr-1 h-4 w-4" />
            {attendanceId ? "Save Correction" : "Save Attendance"}
          </SubmitButton>
        </Sheet.SecondaryFooter>
      ) : null}
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
