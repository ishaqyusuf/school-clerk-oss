// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassroomAttendanceRoster } from "./classroom-attendance-roster";

const students = [
  {
    attendanceKey: "student-term-1",
    id: "student-1",
    studentName: "Ada Okafor",
  },
  {
    attendanceKey: "student-term-2",
    id: "student-2",
    studentName: "Musa Bello",
  },
];

function renderRoster(
  statusMap: Record<string, "PRESENT" | "ABSENT" | "LATE" | undefined>,
) {
  return renderToStaticMarkup(
    createElement(ClassroomAttendanceRoster, {
      commentMap: {},
      direction: "ltr",
      hasMore: false,
      isError: false,
      isLoading: false,
      loadMoreRef: () => undefined,
      onCommentChange: () => undefined,
      onStatusChange: () => undefined,
      statusMap,
      students,
      total: students.length,
    }),
  );
}

describe("ClassroomAttendanceRoster remarks", () => {
  test("hides the remark area when students are unmarked or present", () => {
    expect(renderRoster({})).not.toContain("Remarks");
    expect(
      renderRoster({
        "student-term-1": "PRESENT",
        "student-term-2": "PRESENT",
      }),
    ).not.toContain("Remarks");
  });

  test("shows an optional remark only for absent or late students", () => {
    const absentMarkup = renderRoster({
      "student-term-1": "ABSENT",
      "student-term-2": "PRESENT",
    });
    const lateMarkup = renderRoster({
      "student-term-1": "LATE",
      "student-term-2": "PRESENT",
    });

    expect(absentMarkup).toContain("Remarks");
    expect(absentMarkup).toContain("Remarks for Ada Okafor");
    expect(absentMarkup).not.toContain("Remarks for Musa Bello");
    expect(lateMarkup).toContain("Remarks for Ada Okafor");
  });
});
