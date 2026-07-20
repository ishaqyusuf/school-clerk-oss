export type AttendanceScope = "GENERAL" | "SUBJECT";
export type AttendanceStatus =
  "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "SICK" | "LEAVE";

export const ATTENDANCE_STATUSES: Array<{
  label: string;
  value: AttendanceStatus;
}> = [
  { label: "Present", value: "PRESENT" },
  { label: "Absent", value: "ABSENT" },
  { label: "Late", value: "LATE" },
  { label: "Excused", value: "EXCUSED" },
  { label: "Sick", value: "SICK" },
  { label: "Leave", value: "LEAVE" },
];

export function attendanceStatusLabel(status: string) {
  return (
    ATTENDANCE_STATUSES.find((item) => item.value === status)?.label ?? status
  );
}

export function todayAttendanceDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function attendanceRate(summary: {
  absent?: number;
  excused?: number;
  late?: number;
  leave?: number;
  present?: number;
  sick?: number;
  total?: number;
}) {
  const eligible = Math.max(
    (summary.total ?? 0) -
      (summary.excused ?? 0) -
      (summary.sick ?? 0) -
      (summary.leave ?? 0),
    0,
  );
  return eligible > 0
    ? Math.round(
        (((summary.present ?? 0) + (summary.late ?? 0)) / eligible) * 1000,
      ) / 10
    : 0;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadAttendanceCsv(
  rows: Array<Record<string, unknown>>,
  filename: string,
) {
  if (!rows.length) return;
  const headers = [
    "Date",
    "Classroom",
    "Scope",
    "Subject",
    "Period",
    "Student",
    "Status",
    "Comment",
    "Recorded by",
  ];
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.attendanceDate instanceof Date
          ? row.attendanceDate.toISOString().slice(0, 10)
          : row.attendanceDate,
        row.classroom,
        row.scope,
        row.subject,
        row.periodLabel,
        row.studentName,
        row.status,
        row.comment,
        row.recordedBy,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function studentRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

export function attendanceRevisionSummary(snapshot: unknown) {
  if (!isRecord(snapshot)) return "Session metadata was recorded.";
  const before = isRecord(snapshot.before) ? snapshot.before : null;
  const after = isRecord(snapshot.after) ? snapshot.after : null;

  if (before && after) {
    const changedFields = [
      ["attendanceDate", "date"],
      ["attendanceTitle", "title"],
      ["departmentId", "classroom"],
      ["departmentSubjectId", "subject"],
      ["periodLabel", "period"],
      ["scope", "attendance type"],
    ]
      .filter(
        ([field]) =>
          JSON.stringify(before[field]) !== JSON.stringify(after[field]),
      )
      .map(([, label]) => label);
    const beforeStudents = studentRows(before.studentAttendanceList);
    const afterStudents = studentRows(after.students);
    const previousByStudent = new Map(
      beforeStudents.map((student) => [student.studentTermFormId, student]),
    );
    const changedMarks = afterStudents.filter((student) => {
      const previous = previousByStudent.get(student.studentTermFormId);
      return (
        !previous ||
        previous.status !== student.status ||
        (previous.comment ?? null) !== (student.comment ?? null)
      );
    }).length;
    const changes = [
      changedFields.length ? `changed ${changedFields.join(", ")}` : null,
      changedMarks
        ? `updated ${changedMarks} student mark${changedMarks === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean);
    return changes.length
      ? `${changes.join("; ")}.`
      : "Saved without data changes.";
  }

  const students = studentRows(
    snapshot.students ?? snapshot.studentAttendanceList,
  );
  return students.length
    ? `Recorded ${students.length} student mark${students.length === 1 ? "" : "s"}.`
    : "Session metadata was recorded.";
}
