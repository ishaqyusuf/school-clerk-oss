// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import {
  filterTermsBySession,
  getEnrollmentFilterRemovalUpdate,
  getEnrollmentFilterSelectionUpdate,
} from "./student-enrollment-filter-model";

const filters = [
  {
    label: "Enrolled session",
    type: "checkbox" as const,
    value: "sessionId",
    options: [
      { label: "2024/2025", value: "session-1" },
      { label: "2025/2026", value: "session-2" },
    ],
  },
  {
    label: "Enrolled term",
    type: "checkbox" as const,
    value: "sessionTermId",
    options: [
      {
        label: "First Term | 2024/2025",
        value: "term-1",
        parentValue: "session-1",
      },
      {
        label: "First Term | 2025/2026",
        value: "term-2",
        parentValue: "session-2",
      },
    ],
  },
];

const secondSession = filters[0]?.options?.[1];
const secondSessionTerm = filters[1]?.options?.[1];

if (!secondSession || !secondSessionTerm) {
  throw new Error("Enrollment filter fixtures are incomplete");
}

describe("student enrollment period filters", () => {
  test("shows only terms belonging to the selected session", () => {
    expect(filterTermsBySession(filters, "session-2")[1]?.options).toEqual([
      {
        label: "First Term | 2025/2026",
        value: "term-2",
        parentValue: "session-2",
      },
    ]);
  });

  test("selecting a term also selects its parent session", () => {
    expect(
      getEnrollmentFilterSelectionUpdate({
        filterKey: "sessionTermId",
        option: secondSessionTerm,
        currentFilters: { sessionId: "session-1", sessionTermId: "term-1" },
        filterList: filters,
      }),
    ).toEqual({ sessionId: "session-2", sessionTermId: "term-2" });
  });

  test("changing session clears an incompatible term", () => {
    expect(
      getEnrollmentFilterSelectionUpdate({
        filterKey: "sessionId",
        option: secondSession,
        currentFilters: { sessionId: "session-1", sessionTermId: "term-1" },
        filterList: filters,
      }),
    ).toEqual({ sessionId: "session-2", sessionTermId: null });
  });

  test("clearing session clears term while clearing term keeps session", () => {
    expect(getEnrollmentFilterRemovalUpdate("sessionId")).toEqual({
      sessionId: null,
      sessionTermId: null,
    });
    expect(getEnrollmentFilterRemovalUpdate("sessionTermId")).toEqual({
      sessionTermId: null,
    });
  });
});
