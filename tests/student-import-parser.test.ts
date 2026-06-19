import { describe, expect, test } from "bun:test";
import { parseRawInput } from "../apps/dashboard/src/components/modals/student-import/parser";

describe("parseRawInput", () => {
  test("keeps dot-delimited name parts explicit", () => {
    const result = parseRawInput(
      "John.Doe.Middle",
      "Primary 1",
      "classroom-1",
    );

    expect(result.students[0]).toMatchObject({
      name: "John",
      surname: "Doe",
      otherName: "Middle",
    });
  });

  test("preserves final comma-delimited gender alias", () => {
    const result = parseRawInput(
      "John Doe, Male",
      "Primary 1",
      "classroom-1",
      undefined,
      ["John", "Doe"],
    );

    expect(result.students[0]).toMatchObject({
      name: "John",
      surname: "Doe",
      gender: "M",
      parsedGender: "M",
    });
  });

  test("supports Arabic comma and guided multi-word Arabic first names", () => {
    const result = parseRawInput(
      "عبد الله محمد، M",
      "Primary 1",
      "classroom-1",
      undefined,
      ["عبد الله", "محمد"],
    );

    expect(result.students[0]).toMatchObject({
      name: "عبد الله",
      surname: "محمد",
      gender: "M",
    });
  });

  test("matches Arabic guide names after Arabic normalization", () => {
    const result = parseRawInput(
      "احمد علي يوسف",
      "Primary 1",
      "classroom-1",
      undefined,
      ["أحمد علي", "يوسف"],
    );

    expect(result.students[0]).toMatchObject({
      name: "احمد علي",
      surname: "يوسف",
    });
  });

  test("trims and deduplicates name guide entries before matching", () => {
    const result = parseRawInput(
      "Mary Ann Smith",
      "Primary 1",
      "classroom-1",
      undefined,
      ["  Mary   Ann  ", "Mary Ann", "", "Smith"],
    );

    expect(result.students[0]).toMatchObject({
      name: "Mary Ann",
      surname: "Smith",
    });
  });

  test("falls back to whitespace tokens when no guide matches", () => {
    const result = parseRawInput(
      "New Student Name",
      "Primary 1",
      "classroom-1",
      undefined,
      ["Known"],
    );

    expect(result.students[0]).toMatchObject({
      name: "New",
      surname: "Student",
      otherName: "Name",
    });
  });

  test("matches classroom headers while ignoring whitespace and dash variants", () => {
    const result = parseRawInput(
      "الأولالتمهيدي ا\nM\nإبراهيم عبد القادر\n\nالأول التمهيدي-ب\nF\nعائشة عبد الله",
      "",
      "",
      undefined,
      ["إبراهيم", "عبد القادر", "عائشة", "عبد الله"],
      [
        {
          id: "classroom-a",
          departmentName: "ا",
          classRoom: { name: "الأول التمهيدي" },
        },
        {
          id: "classroom-b",
          departmentName: "ب",
          classRoom: { name: "الأول التمهيدي" },
        },
      ],
    );

    expect(result.students).toHaveLength(2);
    expect(result.students[0]).toMatchObject({
      classroomDepartmentId: "classroom-a",
      classroomSource: "header",
      gender: "M",
    });
    expect(result.students[1]).toMatchObject({
      classroomDepartmentId: "classroom-b",
      classroomSource: "header",
      gender: "F",
    });
    expect(result.warnings).toEqual([]);
  });
});
