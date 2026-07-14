// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import {
  buildStudentImportReviewModel,
  type StudentImportReviewRow,
} from "./review-model";

function row(
  overrides: Partial<StudentImportReviewRow> & { lineNumber: number },
): StudentImportReviewRow {
  return {
    classroomDepartmentId: "classroom-1",
    fullMatch: null,
    inferredGender: null,
    inputGender: "Male",
    lineNumber: overrides.lineNumber,
    needsGender: false,
    status: "new",
    suspectedMatches: [],
    ...overrides,
  };
}

describe("buildStudentImportReviewModel", () => {
  test("unchecked attention rows do not block checked executable rows", () => {
    const model = buildStudentImportReviewModel({
      rows: [
        row({ lineNumber: 1 }),
        row({
          classroomDepartmentId: null,
          lineNumber: 2,
          status: "needsAttention",
        }),
      ],
      checkedRows: { 1: true, 2: false },
      rowDecisions: {
        1: { action: "import_new" },
        2: { action: "import_new" },
      },
      manualGenders: {},
      fallbackClassroomDepartmentId: "",
      manualClassroomRequiredLineNumbers: new Set([2]),
    });

    expect(model.counts).toMatchObject({
      checkedRows: 1,
      executableRows: 1,
      blockedCheckedRows: 0,
      uncheckedRows: 1,
    });
    expect(model.canStartImport).toBe(true);
  });

  test("checked rows missing required match candidate block import", () => {
    const model = buildStudentImportReviewModel({
      rows: [
        row({
          fullMatch: { id: "student-1" },
          lineNumber: 1,
          status: "matchFound",
        }),
      ],
      checkedRows: { 1: true },
      rowDecisions: {
        1: { action: "keep_match", existingStudentId: null },
      },
      manualGenders: {},
      fallbackClassroomDepartmentId: "",
      manualClassroomRequiredLineNumbers: new Set(),
    });

    expect(model.counts.blockedCheckedRows).toBe(1);
    expect(model.canStartImport).toBe(false);
    expect(model.disabledReason).toContain("line 1");
  });

  test("all skipped checked rows disable import with a skip-specific reason", () => {
    const model = buildStudentImportReviewModel({
      rows: [row({ fullMatch: { id: "student-1" }, lineNumber: 1 })],
      checkedRows: { 1: true },
      rowDecisions: {
        1: { action: "skip" },
      },
      manualGenders: {},
      fallbackClassroomDepartmentId: "",
      manualClassroomRequiredLineNumbers: new Set(),
    });

    expect(model.counts).toMatchObject({
      checkedRows: 1,
      executableRows: 0,
      skippedRows: 1,
    });
    expect(model.canStartImport).toBe(false);
    expect(model.disabledReason).toContain("marked Skip");
  });

  test("manual gender moves a no-match row out of attention", () => {
    const model = buildStudentImportReviewModel({
      rows: [
        row({
          inputGender: null,
          lineNumber: 1,
          needsGender: true,
          status: "needsAttention",
        }),
      ],
      checkedRows: { 1: true },
      rowDecisions: {
        1: { action: "import_new" },
      },
      manualGenders: { 1: "Female" },
      fallbackClassroomDepartmentId: "",
      manualClassroomRequiredLineNumbers: new Set(),
    });

    expect(model.attentionRows).toHaveLength(0);
    expect(model.readyRows).toHaveLength(1);
    expect(model.canStartImport).toBe(true);
  });

  test("suspected matches need a decision before leaving attention", () => {
    const unresolved = buildStudentImportReviewModel({
      rows: [
        row({
          lineNumber: 1,
          suspectedMatches: [{ id: "student-1" }],
        }),
      ],
      checkedRows: { 1: true },
      rowDecisions: {},
      manualGenders: {},
      fallbackClassroomDepartmentId: "",
      manualClassroomRequiredLineNumbers: new Set(),
    });
    const resolved = buildStudentImportReviewModel({
      rows: [
        row({
          lineNumber: 1,
          suspectedMatches: [{ id: "student-1" }],
        }),
      ],
      checkedRows: { 1: true },
      rowDecisions: {
        1: { action: "import_new" },
      },
      manualGenders: {},
      fallbackClassroomDepartmentId: "",
      manualClassroomRequiredLineNumbers: new Set(),
    });

    expect(unresolved.attentionRows).toHaveLength(1);
    expect(unresolved.matchedRows).toHaveLength(0);
    expect(resolved.attentionRows).toHaveLength(0);
    expect(resolved.matchedRows).toHaveLength(1);
  });
});
