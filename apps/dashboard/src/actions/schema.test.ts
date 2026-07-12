// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { createStaffSchema } from "./schema";

const baseStaff = {
  email: "teacher@school.test",
  role: "Teacher" as const,
};

describe("createStaffSchema staff assignments", () => {
  test("accepts whole-class assignments", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [{ scope: "CLASS", classRoomId: "class-1" }],
    });

    expect(result.success).toBe(true);
  });

  test("requires a class for whole-class assignments", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [{ scope: "CLASS" }],
    });

    expect(result.success).toBe(false);
  });

  test("accepts department all-subject assignments without explicit subjects", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [
        {
          scope: "DEPARTMENT",
          classRoomDepartmentId: "department-1",
          subjectAccessMode: "ALL",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("requires selected subjects for selected department assignments", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [
        {
          scope: "DEPARTMENT",
          classRoomDepartmentId: "department-1",
          subjectAccessMode: "SELECTED",
          departmentSubjectIds: [],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("accepts subject-across-class assignments", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [
        {
          scope: "CLASS_SUBJECT",
          classRoomId: "class-1",
          subjectId: "subject-1",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("requires class and subject for subject-across-class assignments", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [{ scope: "CLASS_SUBJECT", classRoomId: "class-1" }],
    });

    expect(result.success).toBe(false);
  });

  test("accepts precise department-subject assignments", () => {
    const result = createStaffSchema.safeParse({
      ...baseStaff,
      assignments: [
        {
          scope: "DEPARTMENT_SUBJECT",
          departmentSubjectId: "department-subject-1",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("allows non-teaching roles without academic assignments", () => {
    const result = createStaffSchema.safeParse({
      email: "admin@school.test",
      role: "Admin",
      assignments: [],
    });

    expect(result.success).toBe(true);
  });
});
