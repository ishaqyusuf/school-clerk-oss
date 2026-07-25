import { describe, expect, test } from "bun:test";

import {
  createPendingReportPrint,
  createSaveReportPrintInput,
  filterResultStudents,
  filterStudentsByPrintStatus,
  getAssessmentPrintColumns,
  getAssessmentPrintStatus,
  getAssessmentPrintableWeight,
  getResultScore,
  initialReportPrintConfirmationState,
  isPrintableAssessment,
  reportPrintConfirmationReducer,
  saveAssessementSchema,
  sortResultRoster,
} from "./index";

const baseAssessment = {
  title: "Pages revised",
  obtainable: null,
  index: 0,
  percentageObtainable: 0,
  departmentSubjectId: "subject-1",
  isGroup: false,
  printMode: "expanded" as const,
  parentAssessmentId: null,
  childAssessments: [],
};

describe("assessment maximum validation", () => {
  test("accepts an uncapped standalone informational assessment", () => {
    expect(saveAssessementSchema.safeParse(baseAssessment).success).toBe(true);
  });

  test("requires a positive maximum for weighted assessments and grouped children", () => {
    const weighted = saveAssessementSchema.safeParse({
      ...baseAssessment,
      percentageObtainable: 10,
    });
    const grouped = saveAssessementSchema.safeParse({
      ...baseAssessment,
      title: "Exam",
      isGroup: true,
      childAssessments: [
        {
          title: "Oral",
          obtainable: 0,
          percentageObtainable: 0,
        },
      ],
    });

    expect(weighted.success).toBe(false);
    expect(grouped.success).toBe(false);
  });
});

describe("uncapped informational result values", () => {
  test("keeps a zero-weight uncapped value out of calculated totals", () => {
    expect(
      getResultScore(
        {
          id: 1,
          title: "Pages revised",
          obtainable: null,
          percentageObtainable: 0,
        },
        { obtained: 750 },
      ),
    ).toBe(0);
  });
});

const roster = [
  {
    id: "female-zainab",
    student: { gender: "Female", surname: "Zainab", name: "Bello" },
  },
  {
    id: "male-umar",
    student: { gender: "Male", surname: "Umar", name: "Ali" },
  },
  {
    id: "female-aisha",
    student: { gender: "Female", surname: "Aisha", name: "Yusuf" },
  },
  {
    id: "male-adam",
    student: { gender: "Male", surname: "Adam", name: "Garba" },
  },
];

describe("result roster ordering", () => {
  test("sorts male students first, then names alphabetically within gender", () => {
    expect(sortResultRoster(roster).map((student) => student.id)).toEqual([
      "male-umar",
			"male-adam",
      "female-zainab",
			"female-aisha",
    ]);
		expect(
			sortResultRoster(roster, "SURNAME_FIRST_OTHER").map(
				(student) => student.id,
			),
		).toEqual(["male-adam", "male-umar", "female-aisha", "female-zainab"]);
  });

  test("keeps shared roster ordering after name filtering", () => {
    expect(
      filterResultStudents({
        students: roster,
        search: "a",
				nameFormat: "SURNAME_FIRST_OTHER",
      }).map((student) => student.id),
    ).toEqual(["male-adam", "male-umar", "female-aisha", "female-zainab"]);
  });

  test("filters students by term-scoped report print status", () => {
    const printedAtByTermFormId = {
      "male-adam": new Date("2026-07-25T10:00:00.000Z"),
      "female-aisha": null,
    };

    expect(
      filterStudentsByPrintStatus({
        students: roster,
        printStatus: "printed",
        printedAtByTermFormId,
      }).map((student) => student.id),
    ).toEqual(["male-adam"]);

    expect(
      filterStudentsByPrintStatus({
        students: roster,
        printStatus: "pending",
        printedAtByTermFormId,
      }).map((student) => student.id),
    ).toEqual(["female-zainab", "male-umar", "female-aisha"]);

    expect(
      filterStudentsByPrintStatus({
        students: roster,
        printStatus: "all",
        printedAtByTermFormId,
      }),
    ).toEqual(roster);
  });
});

describe("report print confirmation workflow", () => {
  test.each(["browser", "pdf"] as const)(
    "captures the exact %s print selection before confirmation",
    (source) => {
      const selectedIds = ["term-form-1", "term-form-2"];
      const pendingPrint = createPendingReportPrint({
        source,
        termId: "term-1",
        termFormIds: selectedIds,
      });
      selectedIds.push("term-form-3");

      expect(pendingPrint).toEqual({
        source,
        termId: "term-1",
        termFormIds: ["term-form-1", "term-form-2"],
      });
    },
  );

  test("declining or dismissing clears the pending print without recording", () => {
    const pending = reportPrintConfirmationReducer(
      initialReportPrintConfirmationState,
      {
        type: "print-completed",
        payload: {
          source: "browser",
          termId: "term-1",
          termFormIds: ["term-form-1"],
        },
      },
    );

    expect(
      reportPrintConfirmationReducer(pending, { type: "dismissed" }),
    ).toEqual(initialReportPrintConfirmationState);
  });

  test("a failed save retains the selection for an explicit retry", () => {
    const pending = reportPrintConfirmationReducer(
      initialReportPrintConfirmationState,
      {
        type: "print-completed",
        payload: {
          source: "pdf",
          termId: "term-1",
          termFormIds: ["term-form-1"],
        },
      },
    );
    const failed = reportPrintConfirmationReducer(pending, {
      type: "save-failed",
    });

    expect(failed.saveFailed).toBe(true);
    expect(failed.pendingPrint).toEqual(pending.pendingPrint);
    expect(
      reportPrintConfirmationReducer(failed, { type: "save-succeeded" }),
    ).toEqual(initialReportPrintConfirmationState);
  });

  test("confirmation submits the frozen term and complete selected roster", () => {
    expect(
      createSaveReportPrintInput({
        source: "browser",
        termId: "term-1",
        termFormIds: ["term-form-1", "term-form-2"],
      }),
    ).toEqual({
      termId: "term-1",
      termFormIds: ["term-form-1", "term-form-2"],
    });
  });
});

describe("printable result assessments", () => {
  test("only treats positively weighted assessments as printable", () => {
    expect(isPrintableAssessment({ percentageObtainable: 10 })).toBe(true);
    expect(isPrintableAssessment({ percentageObtainable: 0 })).toBe(false);
    expect(isPrintableAssessment({ percentageObtainable: null })).toBe(false);
    expect(isPrintableAssessment({})).toBe(false);
  });

  test("summarizes standalone assessment print status", () => {
    expect(
      getAssessmentPrintStatus({
        percentageObtainable: 15,
      }),
    ).toMatchObject({
      isGrouped: false,
      printable: true,
      printableWeight: 15,
      label: "Print column",
      warnings: [],
    });

    expect(
      getAssessmentPrintStatus({
        percentageObtainable: 0,
      }),
    ).toMatchObject({
      isGrouped: false,
      printable: false,
      printableWeight: 0,
      label: "No print",
      warnings: [
        "This assessment can be recorded but will not appear on printed results.",
      ],
    });
  });

  test("summarizes grouped assessment print status from child weights", () => {
    const groupedAssessment = {
      isGroup: true,
      percentageObtainable: 50,
      childAssessments: [
        { percentageObtainable: 20 },
        { percentageObtainable: 0 },
        { percentageObtainable: 30 },
      ],
    };
    const groupedStatus = getAssessmentPrintStatus(groupedAssessment);

    expect(getAssessmentPrintableWeight(groupedAssessment)).toBe(50);
    expect(groupedStatus).toMatchObject({
      isGrouped: true,
      printable: true,
      printableWeight: 50,
      label: "Print expanded",
      warnings: [
        "Sub-assessments with 0% weight can be recorded but will not print.",
      ],
    });
  });

  test("summarizes grouped total-only print status", () => {
    expect(
      getAssessmentPrintStatus({
        isGroup: true,
        printMode: "total",
        childAssessments: [
          { percentageObtainable: 20 },
          { percentageObtainable: 30 },
        ],
      }),
    ).toMatchObject({
      isGrouped: true,
      printable: true,
      printableWeight: 50,
      label: "Print total only",
      warnings: [],
    });
  });

  test("warns when grouped assessments have no printable child weight", () => {
    expect(
      getAssessmentPrintStatus({
        isGroup: true,
        childAssessments: [
          { percentageObtainable: 0 },
          { percentageObtainable: null },
        ],
      }),
    ).toMatchObject({
      isGrouped: true,
      printable: false,
      printableWeight: 0,
      label: "No print",
      warnings: [
        "This group has no printable weight and will not appear on printed results.",
        "Sub-assessments with 0% weight can be recorded but will not print.",
      ],
    });
  });

  test("builds printable column previews for standalone and grouped assessments", () => {
    expect(
      getAssessmentPrintColumns([
        {
          id: 1,
          title: "Attendance",
          percentageObtainable: 10,
        },
        {
          id: 2,
          title: "Exam",
          isGroup: true,
          printMode: "expanded",
          childAssessments: [
            {
              id: 3,
              title: "Oral",
              percentageObtainable: 20,
            },
            {
              id: 4,
              title: "Practice",
              percentageObtainable: 0,
            },
          ],
        },
        {
          id: 5,
          title: "Project",
          isGroup: true,
          printMode: "total",
          childAssessments: [
            {
              id: 6,
              title: "Build",
              percentageObtainable: 15,
            },
            {
              id: 7,
              title: "Review",
              percentageObtainable: 15,
            },
          ],
        },
      ]),
    ).toEqual([
      {
        id: 1,
        label: "Attendance",
        weight: 10,
      },
      {
        id: 3,
        label: "Exam - Oral",
        weight: 20,
      },
      {
        id: 5,
        label: "Project",
        weight: 30,
      },
    ]);
  });
});
