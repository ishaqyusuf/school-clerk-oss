import { describe, expect, test } from "bun:test";
import { resolveTenantWorkspace } from "./tenant-workspace";

type Database = Parameters<typeof resolveTenantWorkspace>[0];
const input = { token: "test-token", userId: "user-a", tenantSlug: "school-a" };
const authentication = { id: "auth-a", user: { saasAccountId: "account-a" } };
const school = {
  id: "school-a", subDomain: "school-a", activeSessionTermId: "term-a",
  sessions: [
    { id: "session-a", title: "A", terms: [{ id: "term-a", title: "First", sessionId: "session-a", startDate: null, endDate: null }] },
    { id: "session-b", title: "B", terms: [{ id: "term-b", title: "Second", sessionId: "session-b", startDate: null, endDate: null }] },
  ],
};
function fixture(options: { authentication?: typeof authentication | null; candidates?: { id: string; accountId: string }[]; storedSchool?: typeof school | null; candidateError?: boolean } = {}) {
  let schoolReads = 0;
  // Test double implements only the three read methods used by this database facade.
  const db = {
    session: { findFirst: async () => options.authentication === undefined ? authentication : options.authentication },
    schoolProfile: {
      findMany: async () => { if (options.candidateError) throw new Error("database unavailable"); return options.candidates ?? [{ id: "school-a", accountId: "account-a" }]; },
      findFirst: async () => { schoolReads++; return options.storedSchool === undefined ? school : options.storedSchool; },
    },
  } as unknown as Database;
  return { db, schoolReads: () => schoolReads };
}

describe("concurrent workspace reads preserve authorization", () => {
  test("independent reads start together but no workspace is granted before validation", async () => {
    const started: string[] = [];
    let releaseAuth!: (value: typeof authentication | null) => void;
    let releaseCandidates!: (value: { id: string; accountId: string }[]) => void;
    let ancestryReads = 0;
    const db = {
      session: { findFirst: () => { started.push("auth"); return new Promise(resolve => { releaseAuth = resolve; }); } },
      schoolProfile: {
        findMany: () => { started.push("candidates"); return new Promise(resolve => { releaseCandidates = resolve; }); },
        findFirst: async () => { ancestryReads++; return school; },
      },
    } as unknown as Database;
    const pending = resolveTenantWorkspace(db, input);
    expect(started).toEqual(["auth", "candidates"]);
    expect(ancestryReads).toBe(0);
    releaseCandidates([{ id: "school-a", accountId: "account-a" }]);
    await Promise.resolve();
    expect(ancestryReads).toBe(0);
    releaseAuth(null);
    expect(await pending).toBeNull();
    expect(ancestryReads).toBe(0);
  });
  test("valid stored session resolves only its canonical school and academic context", async () => {
    const f = fixture();
    expect(await resolveTenantWorkspace(f.db, input)).toEqual({schoolId:"school-a",domain:"school-a",sessionId:"session-a",sessionTitle:"A",termId:"term-a",termTitle:"First"});
  });
  test("missing or expired stored session cannot access a workspace", async () => {
    const f = fixture({authentication:null});
    expect(await resolveTenantWorkspace(f.db, input)).toBeNull();
    expect(f.schoolReads()).toBe(0);
  });
  test("another account's school cannot be authorized", async () => {
    const f=fixture({candidates:[{id:"school-b",accountId:"account-b"}]});
    expect(await resolveTenantWorkspace(f.db,input)).toBeNull();
    expect(f.schoolReads()).toBe(0);
  });
  test("ambiguous duplicate tenant domains remain denied", async () => {
    const f=fixture({candidates:[{id:"school-a",accountId:"account-a"},{id:"duplicate",accountId:"account-a"}]});
    expect(await resolveTenantWorkspace(f.db,input)).toBeNull();
    expect(f.schoolReads()).toBe(0);
  });
  test("failed live school/session ancestry validation remains denied", async () => {
    const f=fixture({storedSchool:null});
    expect(await resolveTenantWorkspace(f.db,input)).toBeNull();
  });
  test("foreign school cookie cannot switch the canonical workspace", async () => {
    const f=fixture();
    const actual=await resolveTenantWorkspace(f.db,{...input,selection:{schoolId:"school-b",sessionId:"session-b",termId:"term-b"}});
    expect(actual?.schoolId).toBe("school-a"); expect(actual?.sessionId).toBe("session-a");
  });
  test("strict foreign school selection remains denied", async () => {
    expect(await resolveTenantWorkspace(fixture().db,{...input,strictSelection:true,selection:{schoolId:"school-b",sessionId:"session-b"}})).toBeNull();
  });
  test("strict term from a different academic session remains denied", async () => {
    expect(await resolveTenantWorkspace(fixture().db,{...input,strictSelection:true,selection:{schoolId:"school-a",sessionId:"session-a",termId:"term-b"}})).toBeNull();
  });
  test("unknown term cannot be selected in strict mode", async () => {
    expect(await resolveTenantWorkspace(fixture().db,{...input,strictSelection:true,selection:{schoolId:"school-a",termId:"foreign-term"}})).toBeNull();
  });
  test("database read failures cannot grant access", async () => {
    const db=fixture({candidateError:true}).db;
    await expect(resolveTenantWorkspace(db,input)).rejects.toThrow("database unavailable");
  });
});
