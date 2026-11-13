import type { DatabaseTransaction } from "./prisma";
import { describe, expect, test } from "bun:test";
import { createStudentSchema } from "@school-clerk/utils/student-create-schema";
import type { Prisma } from "./generated/client";
import { createPreparedStudentRegistration, prepareStudentRegistration } from "./student-registration";

function transaction({ finance = false, academics = true, configured = true } = {}) {
  const modules = ["STUDENT_MANAGEMENT", ...(academics ? ["ACADEMIC_PROGRAMS"] : []), ...(finance ? ["BILLING_FINANCE"] : [])];
  let previewReads = 0;
  const tx = {
    session: { findFirst: async () => ({ id: "login-1", user: { role: "Admin", saasAccountId: "account-1" } }) },
    schoolProfile: { findFirst: async () => ({ id: "school-1", moduleConfiguration: configured
      ? { version: 1, revision: 0, enabledModules: modules, entitledModules: modules } : null }) },
    sessionTerm: { findMany: async () => [{ id: "term-1", lifecycleStatus: "ACTIVE", title: "First Term", session: { title: "2026/27" } }],
      findFirst: async () => ({ sessionId: "session-1", lifecycleStatus: "ACTIVE" }) },
    classRoomDepartment: { findFirst: async () => ({ id: "class-1", departmentName: "Gold", classRoom: { name: "JSS 1" } }) },
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

  test("records a self-contained student_created activity in the registration transaction", async () => {
    const fixture = transaction();
    const prepared = await prepareStudentRegistration(fixture.tx, actor, selection, input());
    const activities: Array<{ data: Record<string, unknown> }> = [];
    const writes = {
      students: {
        create: async () => ({ id: "student-1" }),
        findFirstOrThrow: async () => ({ id: "student-1", guardians: [], sessionForms: [] }),
      },
      studentSessionForm: { create: async () => ({ id: "session-form-1" }) },
      studentTermForm: { createMany: async () => ({ count: 1 }) },
      activity: { create: async (query: { data: Record<string, unknown> }) => { activities.push(query); return { id: "activity-1" }; } },
    };
    await createPreparedStudentRegistration(writes as unknown as DatabaseTransaction, prepared, input(),
      { userId: "user-1", author: "Amina Bello" });
    expect(activities).toHaveLength(1);
    expect(activities[0]?.data).toMatchObject({
      schoolProfileId: "school-1",
      type: "student_created",
      userId: "user-1",
      author: "Amina Bello",
      subjectType: "student",
      subjectId: "student-1",
      meta: {
        student: { id: "student-1", name: "QA student Test" },
        classroom: { id: "class-1", name: "JSS 1 Gold" },
        term: { id: "term-1", name: "First Term 2026/27" },
        source: "manual",
      },
    });
  });

  test("skips the activity when no actor is given", async () => {
    const fixture = transaction();
    const prepared = await prepareStudentRegistration(fixture.tx, actor, selection, input());
    let activityWrites = 0;
    const writes = {
      students: { create: async () => ({ id: "student-1" }), findFirstOrThrow: async () => ({ id: "student-1" }) },
      studentSessionForm: { create: async () => ({ id: "session-form-1" }) },
      studentTermForm: { createMany: async () => ({ count: 1 }) },
      activity: { create: async () => { activityWrites++; return { id: "activity-1" }; } },
    };
    await createPreparedStudentRegistration(writes as unknown as DatabaseTransaction, prepared, input());
    expect(activityWrites).toBe(0);
  });
});
