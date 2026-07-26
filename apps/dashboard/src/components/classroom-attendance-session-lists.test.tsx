// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AttendanceSessionList,
  AttendanceSessionStudentList,
} from "./classroom-attendance-session-lists";

describe("responsive attendance session lists", () => {
  test("renders a populated saved session through one mobile-to-table row", () => {
    const html = renderToStaticMarkup(
      createElement(AttendanceSessionList, {
        sessions: [
          {
            absent: 2,
            attendanceDate: "2026-07-26",
            attendanceTitle: "Morning attendance",
            id: "session-1",
            late: 1,
            periodLabel: "Period 1",
            present: 12,
            rate: 86.7,
            staffName: "Amina Yusuf",
            subjectTitle: "Arabic",
          },
        ],
        isDeleting: false,
        onOpen: () => undefined,
      }),
    );

    expect(html).toContain("Morning attendance");
    expect(html).toContain("Taken by ");
    expect(html).toContain("Present");
    expect(html).toContain("Absent");
    expect(html).toContain("86.7%");
    expect(html).toContain("block w-full text-left text-sm md:table");
    expect(html).toContain("md:table-row");
  });

  test("renders recorded students with mobile labels and desktop table semantics", () => {
    const html = renderToStaticMarkup(
      createElement(AttendanceSessionStudentList, {
        students: [
          {
            comment: "Sick",
            id: "student-1",
            status: "ABSENT",
            studentName: "فاطمة أحمد",
          },
        ],
      }),
    );

    expect(html).toContain("فاطمة أحمد");
    expect(html).toContain("Absent");
    expect(html).toContain("Sick");
    expect(html).toContain("block w-full text-left text-sm md:table");
    expect(html).toContain("md:table-row");
  });
});
