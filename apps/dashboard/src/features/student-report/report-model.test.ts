// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { buildStudentReportsById } from "./report-model";

describe("buildStudentReportsById", () => {
  test("omits zero-weight assessments from printable tables and grade totals", () => {
    const reports = buildStudentReportsById({
      classrooms: [
        {
          id: "classroom-a",
          departmentName: "A",
          classRoom: { name: "Class 1" },
        },
      ],
      departmentSheets: [
        {
          departmentName: "A",
          studentTermForms: [
            {
              id: "term-form-1",
              classroomDepartmentId: "classroom-a",
              student: {
                id: "student-1",
                surname: "Aminu",
                name: "Sadiq",
                otherName: null,
                gender: "Male",
              },
            },
          ],
          subjects: [
            {
              subject: { title: "Mathematics" },
              assessments: [
                {
                  title: "Exam",
                  percentageObtainable: 40,
                  obtainable: 80,
                  index: 1,
                  assessmentResults: [
                    {
                      obtained: 60,
                      percentageScore: null,
                      studentTermFormId: "term-form-1",
                    },
                  ],
                },
                {
                  title: "Practice",
                  percentageObtainable: 0,
                  obtainable: 10,
                  index: 2,
                  assessmentResults: [
                    {
                      obtained: 10,
                      percentageScore: null,
                      studentTermFormId: "term-form-1",
                    },
                  ],
                },
              ],
            },
            {
              subject: { title: "Handwriting" },
              assessments: [
                {
                  title: "Observation",
                  percentageObtainable: null,
                  obtainable: 10,
                  index: 1,
                  assessmentResults: [
                    {
                      obtained: 10,
                      percentageScore: null,
                      studentTermFormId: "term-form-1",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const report = reports["term-form-1"];

    expect(report.tables).toHaveLength(1);
    expect(report.tables[0].columns).toHaveLength(3);
    expect(report.tables[0].columns[1].label).toBe("Exam");
    expect(report.tables[0].rows).toHaveLength(1);
    expect(report.tables[0].rows[0].columns.map((column) => column.value)).toEqual([
      "1. Mathematics",
      30,
      30,
    ]);
    expect(report.grade).toMatchObject({
      obtained: 30,
      obtainable: 40,
      percentage: 75,
    });
    expect(report.summary).toEqual({
      subjects: 1,
      results: 1,
    });
  });

  test("collapses grouped total-mode children into one printable parent column", () => {
    const reports = buildStudentReportsById({
      departmentSheets: [
        {
          departmentName: "A",
          studentTermForms: [
            {
              id: "term-form-1",
              classroomDepartmentId: "classroom-a",
              student: {
                id: "student-1",
                surname: "Bala",
                name: "Musa",
                otherName: null,
                gender: "Male",
              },
            },
          ],
          subjects: [
            {
              subject: { title: "Arabic" },
              assessments: [
                {
                  title: "Oral",
                  parentAssessment: {
                    id: 10,
                    title: "Exam",
                    index: 1,
                    printMode: "TOTAL",
                  },
                  percentageObtainable: 20,
                  obtainable: 10,
                  index: 1,
                  assessmentResults: [
                    {
                      obtained: 5,
                      percentageScore: null,
                      studentTermFormId: "term-form-1",
                    },
                  ],
                },
                {
                  title: "Written",
                  parentAssessment: {
                    id: 10,
                    title: "Exam",
                    index: 1,
                    printMode: "TOTAL",
                  },
                  percentageObtainable: 30,
                  obtainable: 30,
                  index: 2,
                  assessmentResults: [
                    {
                      obtained: 15,
                      percentageScore: null,
                      studentTermFormId: "term-form-1",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const report = reports["term-form-1"];

    expect(report.tables).toHaveLength(1);
    expect(report.tables[0].columns).toHaveLength(3);
    expect(report.tables[0].columns[1]).toEqual({
      label: "Exam",
      subLabel: "(50)",
    });
    expect(report.tables[0].rows[0].columns.map((column) => column.value)).toEqual([
      "1. Arabic",
      25,
      25,
    ]);
    expect(report.grade).toMatchObject({
      obtained: 25,
      obtainable: 50,
      percentage: 50,
    });
  });
});
