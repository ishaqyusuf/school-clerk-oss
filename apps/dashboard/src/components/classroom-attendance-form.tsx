"use client";

import {
  resolveRosterDataDirection,
  useAcademicDataDirection,
} from "@/components/academic-data-direction/provider";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import {
  type AttendanceScope,
  type AttendanceStatus,
  type RecordableAttendanceStatus,
  allowsAttendanceRemark,
  applyBulkAttendanceStatus,
  attendanceFormDetailsSchema,
  attendanceStatusLabel,
  filterAttendanceRemarks,
  todayAttendanceDate,
} from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
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
} from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import {
  AttendanceBulkActions,
  AttendanceDatePicker,
} from "./attendance-recorder-controls";
import { AttendanceSessionDetails } from "./attendance-session-details";
import { ClassroomAttendanceRoster } from "./classroom-attendance-roster";
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
            <AttendanceSessionDetails
              attendanceId={attendanceSessionId}
              presentation="sheet"
            />
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

export function ClassroomAttendanceCorrectionRecorder({
  attendanceId,
  departmentId,
  onSaved,
}: {
  attendanceId?: string | null;
  departmentId?: string | null;
  onSaved: () => void;
}) {
  return (
    <AttendanceFormContent
      attendanceId={attendanceId}
      departmentId={departmentId}
      inline
      onSaved={onSaved}
    />
  );
}

const ROSTER_RENDER_BATCH_SIZE = 25;

type AttendanceFieldErrors = Partial<
  Record<
    "attendanceDate" | "attendanceTitle" | "departmentSubjectId" | "roster",
    string
  >
>;

function AttendanceFormContent({
  attendanceId,
  departmentId,
  inline = false,
  onSaved,
}: {
  attendanceId?: string | null;
  departmentId?: string | null;
  inline?: boolean;
  onSaved?: () => void;
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
    onSaved?.();
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
        comment: allowsAttendanceRemark(statusMap[student.attendanceKey])
          ? commentMap[student.attendanceKey]?.trim() || undefined
          : undefined,
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
  const applyBulkStatus = (
    status: RecordableAttendanceStatus,
    mode: "all" | "rest",
  ) => {
    const nextStatusMap = applyBulkAttendanceStatus(
      statusMap,
      roster.map((student) => student.attendanceKey),
      status,
      mode,
    );
    setStatusMap(nextStatusMap);
    setCommentMap((current) =>
      filterAttendanceRemarks(current, nextStatusMap),
    );
    setFieldErrors((current) => ({
      ...current,
      roster: undefined,
    }));
    toast({
      title: `${mode === "all" ? "All" : "Remaining"} students marked ${attendanceStatusLabel(status).toLowerCase()}`,
    });
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
        <AttendanceDatePicker
          id="attendance-date"
          value={attendanceDate}
          hasError={Boolean(fieldErrors.attendanceDate)}
          onChange={(value) => {
            setAttendanceDate(value);
            setFieldErrors((current) => ({
              ...current,
              attendanceDate: undefined,
            }));
          }}
        />
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <AttendanceBulkActions
            disabled={isRosterLoading || isRosterError || roster.length === 0}
            onApply={applyBulkStatus}
            onClear={() => {
              setStatusMap({});
              setCommentMap({});
            }}
          />
          {inline ? (
            <SubmitButton
              aria-label="Save attendance"
              isSubmitting={isPending}
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              className="size-9 px-0 lg:w-auto lg:px-3"
            >
              <Save className="size-4" />
              <span className="hidden lg:inline">Save attendance</span>
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
          const nextStatusMap = {
            ...statusMap,
            [attendanceKey]: status,
          };
          setStatusMap(nextStatusMap);
          setCommentMap((current) =>
            filterAttendanceRemarks(current, nextStatusMap),
          );
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
