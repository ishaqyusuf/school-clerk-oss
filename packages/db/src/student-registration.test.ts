import type { DatabaseTransaction } from "./prisma";
import { describe, expect, test } from "bun:test";
import { createStudentSchema } from "@school-clerk/utils/student-create-schema";
import type { Prisma } from "./generated/client";
import { prepareStudentRegistration } from "./student-registration";

function transaction({ finance = false, academics = true, configured = true } = {}) {
  const modules = ["STUDENT_MANAGEMENT", ...(academics ? ["ACADEMIC_PROGRAMS"] : []), ...(finance ? ["BILLING_FINANCE"] : [])];
  let previewReads = 0;
  const tx = {
    session: { findFirst: async () => ({ id: "login-1", user: { role: "Admin", saasAccountId: "account-1" } }) },
    schoolProfile: { findFirst: async () => ({ id: "school-1", moduleConfiguration: configured
      ? { version: 1, revision: 0, enabledModules: modules, entitledModules: modules } : null }) },
    sessionTerm: { findMany: async () => [{ id: "term-1", lifecycleStatus: "ACTIVE" }],
      findFirst: async () => ({ sessionId: "session-1", lifecycleStatus: "ACTIVE" }) },
    classRoomDepartment: { findFirst: async () => ({ id: "class-1" }) },
    financeItem: { findMany: async () => { previewReads++; return []; } },
  };
  return { tx: tx as unknown as DatabaseTransaction, previewReads: () => previewReads };
}

const actor = { schoolId: "school-1", userId: "user-1", bearer: "bearer-1" };
const selection = { schoolSessionId: "session-1", sessionTermId: "term-1" };
const input = () => createStudentSchema.parse({ name: "QA student", surname: "Test", gender: "Male", admissionType: "UNCLASSIFIED", classRoomId: "class-1" });

describe("registration module policy", () => {
  test("allows class registration without fees when Finance is disabled", async () => {
    const fixture = transaction();
    const result = await prepareStudentRegistration(fixture.tx, actor, selection, input());
    expect(result.billingEnabled).toBe(false);
    expect(result.enrollment).toMatchObject({ classroomDepartmentId: "class-1", termIds: ["term-1"] });
    expect(fixture.previewReads()).toBe(0);
  });

  test("rejects optional fees when Finance is disabled", async () => {
    await expect(prepareStudentRegistration(transaction().tx, actor, selection,
      { ...input(), selectedOptionalFeeItemIds: ["fee-1"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("rejects payment entries when Finance is disabled", async () => {
    await expect(prepareStudentRegistration(transaction().tx, actor, selection,
      { ...input(), feePayments: [{ feeItemId: "fee-1", amount: 10 }] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("retains fee validation for schools with Finance", async () => {
    const fixture = transaction({ finance: true });
    await expect(prepareStudentRegistration(fixture.tx, actor, selection,
      { ...input(), selectedOptionalFeeItemIds: ["stale-fee"] })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fixture.previewReads()).toBe(1);
    const result = await prepareStudentRegistration(fixture.tx, actor, selection, input());
    expect(result.billingEnabled).toBe(true);
  });

  test("still requires Academics for classroom registration", async () => {
    await expect(prepareStudentRegistration(transaction({ academics: false }).tx, actor, selection, input()))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("does not treat missing module configuration as a non-Finance school", async () => {
    await expect(prepareStudentRegistration(transaction({ configured: false }).tx, actor, selection, input()))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
