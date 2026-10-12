import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ClassroomSectionBar,
  ClassroomSectionHeader,
  ClassroomSectionRail,
  resolveClassroomSection,
} from "./classroom-section-nav";
import type { ClassroomMetrics } from "./use-classroom-metrics";

const metrics: ClassroomMetrics = {
  students: { count: 29, duplicateGroups: 1, isLoading: false },
  attendance: {
    sessions: 5,
    averageRate: 92,
    takenToday: false,
    isLoading: false,
  },
  subjects: { count: 9, needingWeights: 2, isLoading: false },
  payments: { outstanding: 275500, status: "ready", isLoading: false },
};

const navProps = {
  active: "attendance" as const,
  metrics,
  onSelect: () => undefined,
  onClose: () => undefined,
  switcher: createElement("span", null, "JSS 1 Gold"),
  termLabel: "First Term · 2026/2027",
};

describe("classroom section rail", () => {
  test("shows each section once with its live metric instead of header stats", () => {
    const html = renderToStaticMarkup(
      createElement(ClassroomSectionRail, navProps),
    );

    for (const label of [
      "Students",
      "Attendance",
      "Subjects",
      "Payments",
      "Performance",
    ]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain("29 enrolled");
    expect(html).toContain("1 duplicate");
    expect(html).toContain("92% avg");
    expect(html).toContain("today not taken");
    expect(html).toContain("9 subjects");
    expect(html).toContain("2 need weights");
    expect(html).toContain("275,500 due");
    expect(html).toContain("Coming soon");
    expect(html).not.toContain("--");
    // Only the active section is marked as the current page.
    expect(html.match(/aria-current="page"/g)?.length).toBe(1);
    expect(html).toContain("First Term · 2026/2027");
    expect(html).toContain("lg:flex");
  });

  test("shows placeholders while metrics load and calm copy when clear", () => {
    const html = renderToStaticMarkup(
      createElement(ClassroomSectionRail, {
        ...navProps,
        metrics: {
          students: { count: 0, duplicateGroups: 0, isLoading: false },
          attendance: {
            sessions: 0,
            averageRate: null,
            takenToday: true,
            isLoading: false,
          },
          subjects: { count: 1, needingWeights: 0, isLoading: true },
          payments: { outstanding: 0, status: "ready", isLoading: false },
        },
      }),
    );

    expect(html).toContain("0 enrolled");
    expect(html).not.toContain("duplicate");
    expect(html).toContain("No sessions yet");
    expect(html).toContain("taken today");
    expect(html).toContain("animate-pulse");
    expect(html).toContain("Nothing outstanding");
  });

  test("says when finance is off or charges cannot be read instead of 'Nothing outstanding'", () => {
    const render = (status: "disabled" | "unavailable") =>
      renderToStaticMarkup(
        createElement(ClassroomSectionRail, {
          ...navProps,
          metrics: {
            ...metrics,
            payments: { outstanding: 0, status, isLoading: false },
          },
        }),
      );

    expect(render("disabled")).toContain("Finance not enabled");
    expect(render("disabled")).not.toContain("Nothing outstanding");
    expect(render("unavailable")).toContain("Unavailable");
  });

  test("phone bar renders the same sections as scrollable chips with a close button", () => {
    const html = renderToStaticMarkup(
      createElement(ClassroomSectionBar, navProps),
    );

    expect(html).toContain("lg:hidden");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain('aria-label="Close classroom"');
    expect(html).toContain("today not taken");
  });

  test("section header renders title, context and actions", () => {
    const html = renderToStaticMarkup(
      createElement(ClassroomSectionHeader, {
        title: "Students",
        description: "29 enrolled this term",
        actions: createElement("button", null, "Add student"),
      }),
    );

    expect(html).toContain("Students");
    expect(html).toContain("29 enrolled this term");
    expect(html).toContain("Add student");
  });
});

describe("resolveClassroomSection", () => {
  test("defaults missing or legacy overview tabs to Students", () => {
    expect(resolveClassroomSection(null)).toBe("students");
    expect(resolveClassroomSection("overview")).toBe("students");
    expect(resolveClassroomSection("payments")).toBe("payments");
  });
});
