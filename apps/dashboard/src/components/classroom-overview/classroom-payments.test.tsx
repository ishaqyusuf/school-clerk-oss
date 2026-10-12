import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ClassroomPaymentCharge,
  ClassroomPaymentsView,
} from "./classroom-payments";

const charges: ClassroomPaymentCharge[] = [
  {
    id: "c1",
    title: "Tuition",
    amount: 85000,
    amountPaid: 85000,
    outstanding: 0,
    status: "PAID",
    studentName: "Amina Bello",
    student: { id: "s1" },
    stream: { name: "Gold" },
  },
  {
    id: "c2",
    title: "Development levy",
    amount: 15000,
    amountPaid: 6000,
    outstanding: 9000,
    status: "PART_PAID",
    studentName: "عبد الله غاتا",
    student: { id: "s2" },
  },
  {
    id: "c3",
    title: "Uniform",
    amount: 12500,
    amountPaid: 0,
    outstanding: 12500,
    status: "PENDING",
    studentName: "Musa Danjuma",
    student: null,
  },
];

const render = (status: Parameters<typeof ClassroomPaymentsView>[0]["status"], rows = charges) =>
  renderToStaticMarkup(
    createElement(ClassroomPaymentsView, {
      status,
      charges: rows,
      onReceivePayment: () => undefined,
      onOpenStudent: () => undefined,
    }),
  );

describe("classroom payments view", () => {
  test("summarises charges in one line and lists them by outstanding amount", () => {
    const html = render("ready");

    expect(html).toContain("Receive payment");
    expect(html).toContain("2 outstanding, 1 settled");
    expect(html).toContain("₦112,500 billed · ₦91,000 received");
    // 91,000 of 112,500 collected.
    expect(html).toContain("81% collected · 1/3 paid");
    // Largest outstanding first, settled last.
    expect(html.indexOf("Musa Danjuma")).toBeLessThan(
      html.indexOf("عبد الله غاتا"),
    );
    expect(html.indexOf("عبد الله غاتا")).toBeLessThan(
      html.indexOf("Amina Bello"),
    );
    // One Record button per open charge; settled charges have none.
    expect(html.match(/>Record</g)?.length).toBe(2);
    expect(html).toContain('dir="auto"');
    expect(html).toContain("part paid");
  });

  test("explains a disabled finance module instead of claiming nothing is owed", () => {
    const html = render("disabled", []);

    expect(html).toContain("Finance is turned off");
    expect(html).toContain("Billing &amp; Finance");
    expect(html).not.toContain("Receive payment");
    expect(html).not.toContain("No student charges");
  });

  test("shows a load error and an empty state", () => {
    expect(render("error", [])).toContain("Unable to load payments");
    expect(render("error", [])).not.toContain("Receive payment");
    expect(render("ready", [])).toContain("No student charges");
    expect(render("loading", [])).toContain("Loading student charges");
  });
});
