// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { parseRawInput, type ImportClassroomOption } from "./parser";

const classrooms: ImportClassroomOption[] = [
  {
    id: "jss-1-a",
    departmentName: "A",
    classRoom: {
      name: "JSS 1",
    },
  },
  {
    id: "jss-2-b",
    departmentName: "B",
    classRoom: {
      name: "JSS 2",
    },
  },
];

describe("parseRawInput", () => {
  test("assigns rows to classroom headers and gender marker sections", () => {
    const result = parseRawInput(
      [
        "JSS 1 - A",
        "M | Male",
        "John Doe",
        "Yusuf Ahmad, F",
        "JSS 2 - B",
        "F",
        "Maryam Bello",
      ].join("\n"),
      "",
      "",
      "unset",
      [],
      classrooms,
    );

    expect(result.warnings).toEqual([]);
    expect(result.students).toMatchObject([
      {
        name: "John",
        surname: "Doe",
        gender: "M",
        batchGender: "M",
        parsedGender: undefined,
        classroomDepartmentId: "jss-1-a",
        classroomSource: "header",
        classroomResolutionStatus: "resolved",
      },
      {
        name: "Yusuf",
        surname: "Ahmad",
        gender: "F",
        batchGender: undefined,
        parsedGender: "F",
        classroomDepartmentId: "jss-1-a",
        classroomSource: "header",
        classroomResolutionStatus: "resolved",
      },
      {
        name: "Maryam",
        surname: "Bello",
        gender: "F",
        batchGender: "F",
        parsedGender: undefined,
        classroomDepartmentId: "jss-2-b",
        classroomSource: "header",
        classroomResolutionStatus: "resolved",
      },
    ]);
  });

  test("marks rows before a classroom header as needing classroom attention", () => {
    const result = parseRawInput(
      ["Unassigned Student, M", "JSS 1 - A", "Assigned Student, F"].join("\n"),
      "",
      "",
      "unset",
      [],
      classrooms,
    );

    expect(result.students).toMatchObject([
      {
        name: "Unassigned",
        surname: "Student",
        gender: "M",
        classroomDepartmentId: "",
        classroomSource: "missing",
        classroomResolutionStatus: "missing",
      },
      {
        name: "Assigned",
        surname: "Student",
        gender: "F",
        classroomDepartmentId: "jss-1-a",
        classroomSource: "header",
        classroomResolutionStatus: "resolved",
      },
    ]);
    expect(result.warnings).toContainEqual({
      lineNumber: 1,
      text: "Unassigned Student, M",
      warning:
        "Classroom missing; add a class name header or choose a default classroom",
    });
  });

  test("treats ambiguous classroom labels as unresolved classroom context", () => {
    const result = parseRawInput(
      ["A", "Ambiguous Student, M", "JSS 2 - B", "Resolved Student, F"].join(
        "\n",
      ),
      "",
      "",
      "unset",
      [],
      [
        ...classrooms,
        {
          id: "jss-2-a",
          departmentName: "A",
          classRoom: {
            name: "JSS 2",
          },
        },
      ],
    );

    expect(result.students).toMatchObject([
      {
        name: "Ambiguous",
        surname: "Student",
        gender: "M",
        classRoom: "A",
        classroomDepartmentId: "",
        classroomSource: "ambiguous",
        classroomLabel: "A",
        classroomResolutionStatus: "ambiguous",
      },
      {
        name: "Resolved",
        surname: "Student",
        gender: "F",
        classRoom: "JSS 2 - B",
        classroomDepartmentId: "jss-2-b",
        classroomSource: "header",
        classroomResolutionStatus: "resolved",
      },
    ]);
    expect(result.warnings).toContainEqual({
      lineNumber: 1,
      text: "A",
      warning: "Classroom label is ambiguous; choose classroom manually",
    });
    expect(result.warnings).toContainEqual({
      lineNumber: 2,
      text: "Ambiguous Student, M",
      warning:
        "Classroom missing; add a class name header or choose a default classroom",
    });
  });
});
