import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";

import type { TRPCContext } from "@api/trpc/init";

import {
  applyAssessmentWorkbook,
  downloadAssessmentWorkbook,
  previewAssessmentWorkbook,
} from "./assessment-workbooks";

const assessmentWorkbookRequire = createRequire(
  new URL(
    "../../../../../packages/assessment-workbooks/package.json",
    import.meta.url,
  ),
);
const ExcelJS = assessmentWorkbookRequire("exceljs") as {
  Workbook: new () => {
    getWorksheet(name: string): {
      getCell(address: string): { value: unknown };
    } | undefined;
    xlsx: {
      load(input: Buffer): Promise<unknown>;
      writeBuffer(): Promise<ArrayBuffer>;
    };
  };
};

function createContext(gender: "Male" | "Female" | null, role = "Admin") {
  const createdExports: unknown[] = [];
  const activities: unknown[] = [];
  const subject = {
    id: "subject-1",
    subject: { title: "Mathematics" },
    assessments: [
      {
        id: 10,
        title: "Test",
        obtainable: null,
        percentageObtainable: 0,
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
          role,
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
      role,
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

  test("applies workbook scores with workbook-source value history", async () => {
    const { ctx } = createContext("Female");
    const db = ctx.db as unknown as Record<string, any>;
    db.assessmentWorkbookExport.findUnique = async () => ({
      id: "export-1",
      schoolProfileId: "school-1",
      sessionTermId: "term-1",
      classRoomDepartmentId: "class-1",
      revokedAt: null,
    });

    const downloaded = await downloadAssessmentWorkbook(ctx, {
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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      Buffer.from(downloaded.fileBase64, "base64") as never,
    );
    workbook.getWorksheet("Assessment Form")!.getCell("C5").value = 9;
    const editedFileBase64 = Buffer.from(
      await workbook.xlsx.writeBuffer(),
    ).toString("base64");
    const preview = await previewAssessmentWorkbook(ctx, {
      fileBase64: editedFileBase64,
      resolutions: {},
    });

    const historyRows: Record<string, unknown>[] = [];
    let importCreateCount = 0;
    let savedImport: Record<string, unknown> | null = null;
    db.assessmentWorkbookImport = {
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        const key = (
          where.schoolProfileId_idempotencyKey as {
            idempotencyKey: string;
          }
        ).idempotencyKey;
        return savedImport?.idempotencyKey === key ? savedImport : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        importCreateCount += 1;
        savedImport = { ...data, id: "import-1" };
        return savedImport;
      },
    };
    db.studentAssessmentRecord = {
      findUnique: async () => ({ id: 77, obtained: 7 }),
      update: async ({ data }: { data: { obtained: number | null } }) => ({
        id: 77,
        obtained: data.obtained,
      }),
    };
    db.studentAssessmentRecordHistory = {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        historyRows.push(data);
        return { id: "history-1" };
      },
    };
    db.$transaction = async (
      callback: (transaction: typeof db) => unknown,
      options: Record<string, unknown>,
    ) => {
      expect(options).toEqual({
        isolationLevel: "Serializable",
        maxWait: 10_000,
        timeout: 60_000,
      });
      return callback(db);
    };

    const result = await applyAssessmentWorkbook(ctx, {
      fileBase64: editedFileBase64,
      resolutions: {},
      idempotencyKey: "import-key-1",
      previewToken: preview.previewToken,
    });

    expect(result).toEqual(
      expect.objectContaining({
        importId: "import-1",
        alreadyApplied: false,
      }),
    );
    expect(historyRows).toEqual([
      expect.objectContaining({
        schoolProfileId: "school-1",
        previousObtained: 7,
        newObtained: 9,
        source: "WORKBOOK_IMPORT",
        actorUserId: "user-1",
        actorName: "Admin",
        sourceReference: "export-1",
      }),
    ]);
    expect(importCreateCount).toBe(1);

    const replay = await applyAssessmentWorkbook(ctx, {
      fileBase64: editedFileBase64,
      resolutions: {},
      idempotencyKey: "import-key-1",
      previewToken: preview.previewToken,
    });
    expect(replay).toEqual(
      expect.objectContaining({
        importId: "import-1",
        alreadyApplied: true,
      }),
    );
    expect(historyRows).toHaveLength(1);
    expect(importCreateCount).toBe(1);

    db.studentAssessmentRecordHistory.create = async () => {
      throw new Error("history write failed");
    };
    await expect(
      applyAssessmentWorkbook(ctx, {
        fileBase64: editedFileBase64,
        resolutions: {},
        idempotencyKey: "import-key-2",
        previewToken: preview.previewToken,
      }),
    ).rejects.toThrow("history write failed");
    expect(importCreateCount).toBe(1);
  });

  test.each([
    [
      "download",
      (ctx: TRPCContext) =>
        downloadAssessmentWorkbook(ctx, {
          departmentId: "class-1",
          sessionTermId: "term-1",
          direction: "ltr",
          subjects: [
            {
              departmentSubjectId: "subject-1",
              columns: [{ kind: "bare" }],
            },
          ],
        }),
    ],
    [
      "preview",
      (ctx: TRPCContext) =>
        previewAssessmentWorkbook(ctx, {
          fileBase64: "eA==",
          resolutions: {},
        }),
    ],
    [
      "apply",
      (ctx: TRPCContext) =>
        applyAssessmentWorkbook(ctx, {
          fileBase64: "eA==",
          resolutions: {},
          idempotencyKey: "denied-import-key",
          previewToken: "0".repeat(64),
        }),
    ],
  ] as const)(
    "denies non-academic roles before %s workbook access",
    async (_operation, invoke) => {
      const { ctx } = createContext("Female", "Parent");

      await expect(invoke(ctx)).rejects.toThrow(
        "Only administrators and assigned teachers",
      );
    },
  );
});
