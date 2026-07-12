import { describe, expect, test } from "bun:test";

import {
  filterResultStudents,
  getAssessmentPrintColumns,
  getAssessmentPrintStatus,
  getAssessmentPrintableWeight,
  isPrintableAssessment,
  sortResultRoster,
} from "./index";

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
      "male-adam",
      "male-umar",
      "female-aisha",
      "female-zainab",
    ]);
  });

  test("keeps shared roster ordering after name filtering", () => {
    expect(
      filterResultStudents({
        students: roster,
        search: "a",
      }).map((student) => student.id),
    ).toEqual(["male-adam", "male-umar", "female-aisha", "female-zainab"]);
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
