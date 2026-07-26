// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { attendanceFormDetailsSchema } from "./attendance";

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
