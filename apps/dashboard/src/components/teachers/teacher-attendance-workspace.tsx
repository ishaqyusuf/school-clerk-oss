"use client";

import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
import {
  ATTENDANCE_STATUSES,
  type AttendanceScope,
  type AttendanceStatus,
  attendanceRevisionSummary,
  downloadAttendanceCsv,
  todayAttendanceDate,
} from "@/lib/attendance";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Download, Pencil, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TeacherClassroom = {
  id: string;
  displayName: string;
  studentCount: number;
  subjectCount: number;
};

type TeacherStudent = {
  id: string;
  studentId: string;
  classroomDepartmentId: string;
  name: string;
  gender: string;
  classroom: string;
};

type TeacherSubject = {
  id: string;
  title: string;
  classRoomDepartmentId: string;
  displayName: string;
};

type Props = {
  classrooms: TeacherClassroom[];
  students: TeacherStudent[];
  subjects: TeacherSubject[];
};

export function TeacherAttendanceWorkspace({
  classrooms,
  students,
  subjects,
}: Props) {
  const academicDataDirection = useAcademicDataDirection();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<AttendanceScope>("GENERAL");
  const [selectedClassroomId, setSelectedClassroomId] = useState(
    classrooms[0]?.id ?? "",
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    subjects[0]?.id ?? "",
  );
  const [title, setTitle] = useState("Daily attendance");
  const [attendanceDate, setAttendanceDate] = useState(todayAttendanceDate);
  const [periodLabel, setPeriodLabel] = useState("");
  const [statusMap, setStatusMap] = useState<
    Record<string, AttendanceStatus | undefined>
  >({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const idempotencyRequestRef = useRef<{
    fingerprint: string;
    key: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId,
  );
  const effectiveClassroomId =
    scope === "SUBJECT"
      ? (selectedSubject?.classRoomDepartmentId ?? "")
      : selectedClassroomId;
  const selectedClassroom = classrooms.find(
    (classroom) => classroom.id === effectiveClassroomId,
  );
  const selectedStudents = useMemo(
    () =>
      students.filter(
        (student) => student.classroomDepartmentId === effectiveClassroomId,
      ),
    [effectiveClassroomId, students],
  );

  const { data: sessions = [] } = useQuery(
    trpc.attendance.getClassroomAttendance.queryOptions(
      { departmentId: effectiveClassroomId || "-" },
      { enabled: !!effectiveClassroomId },
    ),
  );
  const { data: editingSession } = useQuery(
    trpc.attendance.getAttendanceSession.queryOptions(
      { attendanceId: editingSessionId || "-" },
      { enabled: !!editingSessionId },
    ),
  );
  const { data: report } = useQuery(
    trpc.attendance.getAttendanceReport.queryOptions(
      {
        departmentId: effectiveClassroomId || "-",
        departmentSubjectId:
          scope === "SUBJECT" ? selectedSubjectId || undefined : undefined,
      },
      { enabled: !!effectiveClassroomId },
    ),
  );

  useEffect(() => {
    if (!editingSession) return;
    const sessionScope = editingSession.scope as AttendanceScope;
    setScope(sessionScope);
    setSelectedClassroomId(effectiveClassroomId);
    setSelectedSubjectId(editingSession.departmentSubjectId ?? "");
    setTitle(editingSession.attendanceTitle);
    setAttendanceDate(
      editingSession.attendanceDate
        ? new Date(editingSession.attendanceDate).toISOString().slice(0, 10)
        : todayAttendanceDate(),
    );
    setPeriodLabel(editingSession.periodLabel ?? "");
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
  }, [editingSession, effectiveClassroomId]);

  const resetForm = () => {
    idempotencyRequestRef.current = null;
    setValidationError(null);
    setEditingSessionId(null);
    setTitle(
      scope === "SUBJECT" ? (selectedSubject?.title ?? "") : "Daily attendance",
    );
    setAttendanceDate(todayAttendanceDate());
    setPeriodLabel("");
    setStatusMap({});
    setCommentMap({});
  };

  const invalidateAttendance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.attendance.getClassroomAttendance.queryKey({
          departmentId: effectiveClassroomId || "-",
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.attendance.getStudentAttendanceHistory.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.attendance.getAttendanceReport.queryKey(),
      }),
    ]);
    resetForm();
  };

  const createMutation = useMutation(
    trpc.attendance.takeAttendance.mutationOptions({
      meta: {
        toastTitle: {
          error: "Failed to save attendance",
          loading: "Saving attendance...",
          success: "Attendance recorded",
        },
      },
      onSuccess: invalidateAttendance,
    }),
  );
  const updateMutation = useMutation(
    trpc.attendance.updateAttendanceSession.mutationOptions({
      meta: {
        toastTitle: {
          error: "Failed to update attendance",
          loading: "Updating attendance...",
          success: "Attendance updated",
        },
      },
      onSuccess: invalidateAttendance,
    }),
  );

  const allStudentsMarked =
    selectedStudents.length > 0 &&
    selectedStudents.every((student) => Boolean(statusMap[student.id]));
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (
      !effectiveClassroomId ||
      !title.trim() ||
      !attendanceDate ||
      !allStudentsMarked
    ) {
      setValidationError(
        !effectiveClassroomId
          ? "Select an assigned classroom or subject."
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
      departmentId: effectiveClassroomId,
      departmentSubjectId: scope === "SUBJECT" ? selectedSubjectId : undefined,
      periodLabel: periodLabel.trim() || undefined,
      scope,
      students: selectedStudents.map((student) => ({
        comment: commentMap[student.id]?.trim() || undefined,
        status: statusMap[student.id]!,
        studentTermFormId: student.id,
      })),
    };

    if (editingSessionId) {
      updateMutation.mutate({
        ...payload,
        attendanceId: editingSessionId,
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
  }

  if (!classrooms.length) {
    return (
      <section className="border border-dashed bg-background px-4 py-10 text-sm text-muted-foreground">
        No classroom assignments are available for attendance.
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
      <section className="border bg-background">
        <div className="space-y-4 border-b px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                {editingSessionId ? "Correct attendance" : "Take attendance"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Record a general class register or a subject lesson register.
              </p>
            </div>
            {editingSessionId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetForm}
              >
                <X className="mr-2 size-4" />
                Cancel correction
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Attendance type</Label>
              <Select
                value={scope}
                onValueChange={(value) => {
                  const nextScope = value as AttendanceScope;
                  setScope(nextScope);
                  setEditingSessionId(null);
                  setStatusMap({});
                  setCommentMap({});
                  setTitle(
                    nextScope === "SUBJECT"
                      ? (selectedSubject?.title ?? "")
                      : "Daily attendance",
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">
                    General class attendance
                  </SelectItem>
                  <SelectItem value="SUBJECT" disabled={!subjects.length}>
                    Subject attendance
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "GENERAL" ? (
              <div className="grid gap-2">
                <Label>Classroom</Label>
                <Select
                  value={selectedClassroomId}
                  onValueChange={(value) => {
                    setSelectedClassroomId(value);
                    setEditingSessionId(null);
                    setStatusMap({});
                    setCommentMap({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        <span dir="auto">{classroom.displayName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={(value) => {
                    setSelectedSubjectId(value);
                    const subject = subjects.find((item) => item.id === value);
                    setSelectedClassroomId(
                      subject?.classRoomDepartmentId ?? "",
                    );
                    setTitle(subject?.title ?? "");
                    setEditingSessionId(null);
                    setStatusMap({});
                    setCommentMap({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <span dir="auto">
                          {subject.title} · {subject.displayName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="teacher-attendance-date">Date</Label>
              <Input
                id="teacher-attendance-date"
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="teacher-attendance-title">Session title</Label>
              <Input
                id="teacher-attendance-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Monday morning"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teacher-attendance-period">
              Period or time{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="teacher-attendance-period"
              value={periodLabel}
              onChange={(event) => setPeriodLabel(event.target.value)}
              placeholder="e.g. Period 1, Morning, 08:00"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground" dir="auto">
              {selectedClassroom?.displayName} · {selectedStudents.length}{" "}
              students
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setStatusMap(
                    Object.fromEntries(
                      selectedStudents.map((student) => [
                        student.id,
                        "PRESENT" as const,
                      ]),
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

          <div className="overflow-hidden border" dir={academicDataDirection}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium" dir="auto">
                      {student.name}
                    </TableCell>
                    <TableCell className="min-w-36">
                      <Select
                        value={statusMap[student.id]}
                        onValueChange={(value) =>
                          setStatusMap((current) => ({
                            ...current,
                            [student.id]: value as AttendanceStatus,
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
                    </TableCell>
                    <TableCell>
                      <Input
                        dir="auto"
                        value={commentMap[student.id] ?? ""}
                        onChange={(event) =>
                          setCommentMap((current) => ({
                            ...current,
                            [student.id]: event.target.value,
                          }))
                        }
                        placeholder="Add note"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!selectedStudents.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No students found for this classroom.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {selectedStudents.length > 0 && !allStudentsMarked ? (
            <p className="text-sm text-amber-700">
              Select a status for every student before saving.
            </p>
          ) : null}
          {validationError ? (
            <p role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          ) : null}
          {editingSession?.revisionHistory.length ? (
            <div className="border p-3">
              <p className="text-sm font-medium">Revision history</p>
              <div className="mt-2 space-y-1">
                {editingSession.revisionHistory.map((revision) => (
                  <p
                    key={revision.id}
                    className="text-xs text-muted-foreground"
                  >
                    {revision.action.toLowerCase()} by{" "}
                    {revision.actorName || "School Clerk user"} ·{" "}
                    {new Date(revision.createdAt).toLocaleString()}
                    <span className="mt-0.5 block">
                      {attendanceRevisionSummary(revision.snapshot)}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            <Save className="mr-2 size-4" />
            {editingSessionId ? "Save correction" : "Save attendance"}
          </Button>
        </div>
      </section>

      <section className="border bg-background">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold">Recent sessions</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!report?.rows.length}
            onClick={() =>
              downloadAttendanceCsv(
                (report?.rows ?? []) as Array<Record<string, unknown>>,
                `${
                  selectedClassroom?.displayName
                    .replaceAll(" ", "-")
                    .toLowerCase() ?? "classroom"
                }-attendance.csv`,
              )
            }
          >
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>
        <div className="divide-y px-4 sm:px-5">
          {sessions.map((session) => (
            <div key={session.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{session.attendanceTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(
                      session.attendanceDate ?? session.createdAt ?? Date.now(),
                    ).toLocaleDateString()}
                    {session.subjectTitle ? ` · ${session.subjectTitle}` : ""}
                    {session.periodLabel ? ` · ${session.periodLabel}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarCheck2 className="size-4 text-muted-foreground" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingSessionId(session.id)}
                    aria-label={`Correct ${session.attendanceTitle}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{session.present} present</Badge>
                {session.late ? (
                  <Badge variant="outline">{session.late} late</Badge>
                ) : null}
                <Badge variant="secondary">{session.absent} absent</Badge>
                {session.excused ? (
                  <Badge variant="secondary">{session.excused} excused</Badge>
                ) : null}
              </div>
            </div>
          ))}
          {!sessions.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              No attendance sessions have been recorded for this classroom yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
