// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import {
  ATTENDANCE_STATUSES,
  RECORDABLE_ATTENDANCE_STATUSES,
  allowsAttendanceRemark,
  applyBulkAttendanceStatus,
  attendanceFormDetailsSchema,
  attendanceStatusLabel,
  filterAttendanceRemarks,
} from "./attendance";

describe("attendanceFormDetailsSchema", () => {
  test("accepts complete general attendance details", () => {
    expect(
      attendanceFormDetailsSchema.safeParse({
        attendanceDate: "2026-07-26",
        attendanceTitle: "Morning register",
        departmentId: "department-1",
        departmentSubjectId: "",
        scope: "GENERAL",
      }).success,
    ).toBe(true);
  });

  test("attaches subject attendance errors to the subject field", () => {
    const result = attendanceFormDetailsSchema.safeParse({
      attendanceDate: "2026-07-26",
      attendanceTitle: "Mathematics",
      departmentId: "department-1",
      departmentSubjectId: "",
      scope: "SUBJECT",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual([
      expect.objectContaining({
        message: "Select a subject for subject attendance.",
        path: ["departmentSubjectId"],
      }),
    ]);
  });
});

describe("recordable attendance statuses", () => {
  test("only allows optional remarks for absent and late students", () => {
    expect(allowsAttendanceRemark()).toBe(false);
    expect(allowsAttendanceRemark("PRESENT")).toBe(false);
    expect(allowsAttendanceRemark("ABSENT")).toBe(true);
    expect(allowsAttendanceRemark("LATE")).toBe(true);
    expect(
      filterAttendanceRemarks(
        {
          absentStudent: "Sick",
          lateStudent: "Bus delay",
          presentStudent: "Stale remark",
        },
        {
          absentStudent: "ABSENT",
          lateStudent: "LATE",
          presentStudent: "PRESENT",
        },
      ),
    ).toEqual({
      absentStudent: "Sick",
      lateStudent: "Bus delay",
    });
  });

  test("uses absence remarks instead of a separate sick recording control", () => {
    expect(
      RECORDABLE_ATTENDANCE_STATUSES.map((status) => status.value),
    ).toEqual(["PRESENT", "ABSENT", "LATE"]);
    expect(
      ATTENDANCE_STATUSES.some((status) => String(status.value) === "SICK"),
    ).toBe(false);
    expect(attendanceStatusLabel("SICK")).toBe("Absent");
  });

  test("marks only the unmarked students when applying a rest status", () => {
    expect(
      applyBulkAttendanceStatus(
        {
          studentA: "LATE",
          studentB: undefined,
        },
        ["studentA", "studentB", "studentC"],
        "ABSENT",
        "rest",
      ),
    ).toEqual({
      studentA: "LATE",
      studentB: "ABSENT",
      studentC: "ABSENT",
    });
  });

  test("overwrites every roster status when applying an all status", () => {
    expect(
      applyBulkAttendanceStatus(
        {
          studentA: "LATE",
          studentB: "ABSENT",
        },
        ["studentA", "studentB"],
        "PRESENT",
        "all",
      ),
    ).toEqual({
      studentA: "PRESENT",
      studentB: "PRESENT",
    });
  });
});
