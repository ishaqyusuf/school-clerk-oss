// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { parseAsEnrollmentDate } from "./use-student-filter-params";

describe("student enrollment date URL parser", () => {
  test("parses presets, single days, and inclusive date ranges", () => {
    expect(parseAsEnrollmentDate.parse("this month")).toEqual(["this month"]);
    expect(parseAsEnrollmentDate.parse("2025-01-10")).toEqual(["2025-01-10"]);
    expect(parseAsEnrollmentDate.parse("2025-01-10,2025-01-20")).toEqual([
      "2025-01-10",
      "2025-01-20",
    ]);
  });

  test("rejects malformed and reversed URL ranges", () => {
    expect(parseAsEnrollmentDate.parse("2025-99-99")).toBeNull();
    expect(
      parseAsEnrollmentDate.parse("2025-01-20,2025-01-10"),
    ).toBeNull();
  });

  test("serializes the complete URL value", () => {
    expect(
      parseAsEnrollmentDate.serialize(["2025-01-10", "2025-01-20"]),
    ).toBe("2025-01-10,2025-01-20");
  });
});
