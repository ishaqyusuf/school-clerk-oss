export const RECORDABLE_ATTENDANCE_STATUS_VALUES = [
  "PRESENT",
  "ABSENT",
  "LATE",
] as const;

export const ATTENDANCE_STATUS_VALUES = [
  ...RECORDABLE_ATTENDANCE_STATUS_VALUES,
  "EXCUSED",
  "LEAVE",
] as const;

export type RecordableAttendanceStatus =
  (typeof RECORDABLE_ATTENDANCE_STATUS_VALUES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUS_VALUES)[number];

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
  LEAVE: "Leave",
};
const LEGACY_ATTENDANCE_STATUS_ALIASES: Record<string, AttendanceStatus> = {
  SICK: "ABSENT",
};

export const ATTENDANCE_STATUSES: ReadonlyArray<{
  label: string;
  value: AttendanceStatus;
}> = ATTENDANCE_STATUS_VALUES.map((value) => ({
  label: ATTENDANCE_STATUS_LABELS[value],
  value,
}));

export const RECORDABLE_ATTENDANCE_STATUSES: ReadonlyArray<{
  label: string;
  value: RecordableAttendanceStatus;
}> = RECORDABLE_ATTENDANCE_STATUS_VALUES.map((value) => ({
  label: ATTENDANCE_STATUS_LABELS[value],
  value,
}));

export function normalizeAttendanceStatus(
  status: string | null | undefined,
  isPresent?: boolean | null,
): AttendanceStatus {
  const legacyStatus = status
    ? LEGACY_ATTENDANCE_STATUS_ALIASES[status]
    : undefined;
  if (legacyStatus) return legacyStatus;
  const supportedStatus = ATTENDANCE_STATUS_VALUES.find(
    (value) => value === status,
  );
  return supportedStatus ?? (isPresent ? "PRESENT" : "ABSENT");
}

export function attendanceStatusLabel(status: string) {
  const normalizedStatus = LEGACY_ATTENDANCE_STATUS_ALIASES[status] ?? status;
  return (
    ATTENDANCE_STATUSES.find((item) => item.value === normalizedStatus)
      ?.label ?? status
  );
}

export function applyBulkAttendanceStatus(
  current: Record<string, AttendanceStatus | undefined>,
  attendanceKeys: string[],
  status: RecordableAttendanceStatus,
  mode: "all" | "rest",
) {
  const next = mode === "all" ? {} : { ...current };
  for (const attendanceKey of attendanceKeys) {
    if (mode === "all" || !current[attendanceKey]) {
      next[attendanceKey] = status;
    }
  }
  return next;
}
