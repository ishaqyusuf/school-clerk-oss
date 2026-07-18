import { describe, expect, test } from "bun:test";

import type { ParsedAssessmentWorkbook } from "./contracts";
import { buildAssessmentWorkbookPreview } from "./preview-plan";

function parsedWorkbook(): ParsedAssessmentWorkbook {
  return {
    identity: {
      exportId: "export-1",
      tenantId: "school-1",
      termId: "term-1",
      classroomId: "class-1",
      generatedAt: "2026-07-18T10:00:00.000Z",
      direction: "rtl",
    },
    metadata: {
      schemaVersion: 1,
      identity: {
        exportId: "export-1",
        tenantId: "school-1",
        termId: "term-1",
        classroomId: "class-1",
        generatedAt: "2026-07-18T10:00:00.000Z",
        direction: "rtl",
      },
      visibleSheetName: "Assessment Form",
      studentIdColumn: 5,
      studentRows: [
        {
          row: 5,
          studentId: "student-1",
          studentTermFormId: "form-1",
          displayName: "Ada One",
          gender: "Female",
        },
        {
          row: 6,
          studentId: "student-2",
          studentTermFormId: "form-stale",
          displayName: "Tayo Two",
          gender: "Male",
        },
      ],
      columns: [
        {
          column: 3,
          key: "assessment:10",
          departmentSubjectId: "subject-1",
          subjectTitle: "Mathematics",
          assessmentId: 10,
          assessmentTitle: "Test",
          obtainable: 20,
          originalScores: { "form-1": 5, "form-stale": null },
        },
        {
          column: 4,
          key: "bare:subject-2",
          departmentSubjectId: "subject-2",
          subjectTitle: "English",
          assessmentId: null,
          assessmentTitle: null,
          obtainable: null,
          originalScores: { "form-1": null, "form-stale": null },
        },
      ],
    },
    scoreCells: [
      {
        studentTermFormId: "form-1",
        columnKey: "assessment:10",
        uploaded: "١٢٫٥",
      },
      {
        studentTermFormId: "form-1",
        columnKey: "bare:subject-2",
        uploaded: 8,
      },
      {
        studentTermFormId: "form-stale",
        columnKey: "assessment:10",
        uploaded: "",
      },
      {
        studentTermFormId: "form-stale",
        columnKey: "bare:subject-2",
        uploaded: null,
      },
    ],
  };
}

const live = {
  students: [
    {
      studentId: "student-1",
      studentTermFormId: "form-1",
      displayName: "Ada One",
    },
  ],
  subjects: [
    {
      departmentSubjectId: "subject-1",
      subjectTitle: "Mathematics",
      assessments: [
        {
          id: 10,
          title: "Test",
          obtainable: 20,
          currentScores: { "form-1": 5 },
        },
      ],
    },
    {
      departmentSubjectId: "subject-2",
      subjectTitle: "English",
      assessments: [
        {
          id: 20,
          title: "Exam",
          obtainable: 40,
          currentScores: { "form-1": null },
        },
      ],
    },
  ],
};

describe("buildAssessmentWorkbookPreview", () => {
  test("normalizes Arabic digits, ignores blank stale rows, and blocks unresolved bare columns", () => {
    const result = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live,
      resolutions: {},
    });

    expect(result.summary).toEqual({
      assessmentCreate: 0,
      blank: 0,
      unchanged: 0,
      create: 0,
      update: 1,
      conflict: 0,
      invalid: 0,
      stale: 0,
    });
    expect(result.changes[0]).toMatchObject({
      status: "update",
      uploaded: 12.5,
      studentTermFormId: "form-1",
      assessmentId: 10,
    });
    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: "unresolved-column",
        columnKey: "bare:subject-2",
      }),
    );
  });

  test("can link a bare subject to an existing scoreable assessment", () => {
    const result = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live,
      resolutions: {
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });

    expect(result.blockers).toEqual([]);
    expect(result.summary).toMatchObject({ update: 1, create: 1 });
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        columnKey: "bare:subject-2",
        assessmentId: 20,
        status: "create",
        uploaded: 8,
      }),
    );
  });

  test("can configure a standalone assessment creation for a bare subject", () => {
    const result = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live,
      resolutions: {
        "bare:subject-2": {
          kind: "create",
          title: "Imported Exam",
          obtainable: 50,
          percentageObtainable: 0,
        },
      },
    });

    expect(result.blockers).toEqual([]);
    expect(result.columns[1]).toMatchObject({
      resolution: {
        kind: "create",
        title: "Imported Exam",
        obtainable: 50,
      },
    });
    expect(result.summary.assessmentCreate).toBe(1);
    expect(result.assessmentCreations).toEqual([
      expect.objectContaining({
        columnKey: "bare:subject-2",
        subjectTitle: "English",
        title: "Imported Exam",
        obtainable: 50,
      }),
    ]);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        assessmentId: null,
        status: "create",
        uploaded: 8,
      }),
    );
  });

  test("protects an online edit with a three-way conflict", () => {
    const changedLive = structuredClone(live);
    changedLive.subjects[0]!.assessments[0]!.currentScores["form-1"] = 9;

    const result = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live: changedLive,
      resolutions: {
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });

    expect(result.summary.conflict).toBe(1);
    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: "score-conflict",
        columnKey: "assessment:10",
        studentTermFormId: "form-1",
      }),
    );
  });

  test("blocks a populated row for a student no longer enrolled", () => {
    const workbook = parsedWorkbook();
    workbook.scoreCells[2]!.uploaded = 4;

    const result = buildAssessmentWorkbookPreview({
      workbook,
      live,
      resolutions: {
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });

    expect(result.summary.stale).toBe(1);
    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: "stale-student",
        studentTermFormId: "form-stale",
      }),
    );
  });

  test("rejects an assessment resolution from another subject", () => {
    const result = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live,
      resolutions: {
        "bare:subject-2": { kind: "existing", assessmentId: 10 },
      },
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: "invalid-resolution",
        columnKey: "bare:subject-2",
      }),
    );
  });

  test("offers link or create resolution when a downloaded assessment is no longer available", () => {
    const missingAssessmentLive = structuredClone(live);
    missingAssessmentLive.subjects[0]!.assessments = [
      {
        id: 11,
        title: "Replacement Test",
        obtainable: 30,
        currentScores: { "form-1": 3 },
      },
    ];

    const unresolved = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live: missingAssessmentLive,
      resolutions: {
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });
    expect(unresolved.blockers).toContainEqual(
      expect.objectContaining({
        code: "unavailable-assessment",
        columnKey: "assessment:10",
      }),
    );

    const linked = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live: missingAssessmentLive,
      resolutions: {
        "assessment:10": { kind: "existing", assessmentId: 11 },
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });
    expect(linked.blockers).toEqual([]);
    expect(linked.changes).toContainEqual(
      expect.objectContaining({
        columnKey: "assessment:10",
        assessmentId: 11,
        downloaded: 5,
        current: 3,
        uploaded: 12.5,
        status: "update",
      }),
    );

    const created = buildAssessmentWorkbookPreview({
      workbook: parsedWorkbook(),
      live: missingAssessmentLive,
      resolutions: {
        "assessment:10": {
          kind: "create",
          title: "Recreated Test",
          obtainable: 20,
          percentageObtainable: 0,
        },
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });
    expect(created.blockers).toEqual([]);
    expect(created.summary.assessmentCreate).toBe(1);
    expect(created.changes).toContainEqual(
      expect.objectContaining({
        columnKey: "assessment:10",
        assessmentId: null,
        downloaded: 5,
        uploaded: 12.5,
        status: "create",
      }),
    );
  });

  test("counts standalone assessment creation even when its score cells are blank", () => {
    const workbook = parsedWorkbook();
    workbook.scoreCells.find(
      (cell) => cell.columnKey === "bare:subject-2",
    )!.uploaded = "";

    const result = buildAssessmentWorkbookPreview({
      workbook,
      live,
      resolutions: {
        "bare:subject-2": {
          kind: "create",
          title: "Empty Imported Assessment",
          obtainable: 100,
          percentageObtainable: 0,
        },
      },
    });

    expect(result.summary.assessmentCreate).toBe(1);
    expect(result.assessmentCreations).toHaveLength(1);
    expect(result.changes).toHaveLength(1);
  });

  test("blocks mapping a missing column onto an assessment already represented by another column", () => {
    const workbook = parsedWorkbook();
    workbook.metadata.columns.push({
      column: 6,
      key: "assessment:11",
      departmentSubjectId: "subject-1",
      subjectTitle: "Mathematics",
      assessmentId: 11,
      assessmentTitle: "Replacement Test",
      obtainable: 30,
      originalScores: { "form-1": 3, "form-stale": null },
    });
    workbook.scoreCells.push(
      {
        studentTermFormId: "form-1",
        columnKey: "assessment:11",
        uploaded: 4,
      },
      {
        studentTermFormId: "form-stale",
        columnKey: "assessment:11",
        uploaded: "",
      },
    );
    const collisionLive = structuredClone(live);
    collisionLive.subjects[0]!.assessments = [
      {
        id: 11,
        title: "Replacement Test",
        obtainable: 30,
        currentScores: { "form-1": 3 },
      },
    ];

    const result = buildAssessmentWorkbookPreview({
      workbook,
      live: collisionLive,
      resolutions: {
        "assessment:10": { kind: "existing", assessmentId: 11 },
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: "duplicate-assessment-target",
        columnKey: "assessment:11",
      }),
    );
    expect(
      result.changes.some(
        (change) =>
          change.columnKey === "assessment:10" ||
          change.columnKey === "assessment:11",
      ),
    ).toBe(false);
  });

  test("blocks two missing columns from linking to the same replacement assessment", () => {
    const workbook = parsedWorkbook();
    workbook.metadata.columns.push({
      column: 6,
      key: "assessment:12",
      departmentSubjectId: "subject-1",
      subjectTitle: "Mathematics",
      assessmentId: 12,
      assessmentTitle: "Second Missing Test",
      obtainable: 30,
      originalScores: { "form-1": 2, "form-stale": null },
    });
    workbook.scoreCells.push(
      {
        studentTermFormId: "form-1",
        columnKey: "assessment:12",
        uploaded: 6,
      },
      {
        studentTermFormId: "form-stale",
        columnKey: "assessment:12",
        uploaded: "",
      },
    );
    const collisionLive = structuredClone(live);
    collisionLive.subjects[0]!.assessments = [
      {
        id: 11,
        title: "Replacement Test",
        obtainable: 30,
        currentScores: { "form-1": 3 },
      },
    ];

    const result = buildAssessmentWorkbookPreview({
      workbook,
      live: collisionLive,
      resolutions: {
        "assessment:10": { kind: "existing", assessmentId: 11 },
        "assessment:12": { kind: "existing", assessmentId: 11 },
        "bare:subject-2": { kind: "existing", assessmentId: 20 },
      },
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: "duplicate-assessment-target",
        columnKey: "assessment:12",
      }),
    );
    expect(
      result.changes.some(
        (change) =>
          change.columnKey === "assessment:10" ||
          change.columnKey === "assessment:12",
      ),
    ).toBe(false);
  });
});
