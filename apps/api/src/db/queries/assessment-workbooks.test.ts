import { describe, expect, test } from "bun:test";

import type { TRPCContext } from "@api/trpc/init";

import { downloadAssessmentWorkbook } from "./assessment-workbooks";

function createContext(gender: "Male" | "Female" | null) {
  const createdExports: unknown[] = [];
  const activities: unknown[] = [];
  const subject = {
    id: "subject-1",
    subject: { title: "Mathematics" },
    assessments: [
      {
        id: 10,
        title: "Test",
        obtainable: 20,
        percentageObtainable: 20,
        parentAssessment: null,
        assessmentResults: [{ obtained: 7, studentTermFormId: "form-1" }],
      },
    ],
  };
  const db = {
    session: {
      findFirst: async () => ({
        user: {
          id: "user-1",
          email: "admin@example.test",
          name: "Admin",
          role: "Admin",
        },
      }),
    },
    schoolProfile: {
      findFirst: async () => ({
        accountId: "account-1",
        id: "school-1",
        name: "School",
        subDomain: "school",
      }),
    },
    departmentSubject: {
      findFirst: async () => ({
        classRoomDepartmentId: "class-1",
        sessionTermId: "term-1",
      }),
    },
    classRoomDepartment: {
      findFirst: async () => ({
        id: "class-1",
        departmentName: "A",
        classRoom: { name: "JSS 1" },
        subjects: [subject],
        studentTermForms: [
          {
            id: "form-1",
            student: {
              id: "student-1",
              gender,
              name: "Ada",
              otherName: null,
              surname: "One",
            },
          },
        ],
      }),
    },
    sessionTerm: {
      findFirst: async () => ({
        title: "First Term",
        session: { title: "2026/2027" },
      }),
    },
    assessmentWorkbookExport: {
      create: async ({ data }: { data: unknown }) => {
        createdExports.push(data);
        return {
          id: "export-1",
          createdAt: new Date("2026-07-18T12:00:00.000Z"),
        };
      },
    },
    activity: {
      create: async ({ data }: { data: unknown }) => {
        activities.push(data);
        return data;
      },
    },
  };
  const ctx = {
    db,
    profile: {
      authSessionId: "session-1",
      schoolId: "school-1",
      termId: "term-1",
      sessionId: "session-year-1",
    },
    currentUser: {
      id: "user-1",
      email: "admin@example.test",
      name: "Admin",
      role: "Admin",
      saasAccountId: "account-1",
    },
  } as unknown as TRPCContext;

  return { activities, createdExports, ctx };
}

describe("downloadAssessmentWorkbook", () => {
  test("blocks download when an enrolled student has unspecified gender", async () => {
    const { ctx, createdExports } = createContext(null);

    await expect(
      downloadAssessmentWorkbook(ctx, {
        departmentId: "class-1",
        sessionTermId: "term-1",
        direction: "rtl",
        subjects: [
          {
            departmentSubjectId: "subject-1",
            columns: [{ kind: "bare" }],
          },
        ],
      }),
    ).rejects.toThrow(
      "Every enrolled student must have Male or Female selected",
    );
    expect(createdExports).toHaveLength(0);
  });

  test("generates and audits a selected assessment workbook", async () => {
    const { ctx, createdExports, activities } = createContext("Female");

    const result = await downloadAssessmentWorkbook(ctx, {
      departmentId: "class-1",
      sessionTermId: "term-1",
      direction: "rtl",
      subjects: [
        {
          departmentSubjectId: "subject-1",
          columns: [{ kind: "assessment", assessmentId: 10 }],
        },
      ],
    });

    expect(result.exportId).toBe("export-1");
    expect(result.fileName).toEndWith("-assessment-workbook.xlsx");
    expect(Buffer.from(result.fileBase64, "base64").byteLength).toBeGreaterThan(
      1_000,
    );
    expect(createdExports).toHaveLength(1);
    expect(activities).toContainEqual(
      expect.objectContaining({
        type: "assessment_workbook_downloaded",
      }),
    );
  });
});
