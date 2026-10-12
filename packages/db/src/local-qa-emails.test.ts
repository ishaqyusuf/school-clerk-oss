import { describe, expect, test } from "bun:test";
import { isLocalQaEmail } from "./development-access";
import { assertLocalLoopbackDatabase, buildLocalQaEmailMap } from "./local-qa-emails";

describe("buildLocalQaEmailMap", () => {
  test("maps each original address to a readable, unique QA address", () => {
    const map = buildLocalQaEmailMap([
      "Head.Teacher@school.ng",
      "head.teacher@gmail.com",
      "head.teacher@school.ng", // same address, different case
      "amina+admin@school.ng",
      "already@ishaq.qa.test",
      "",
      null,
    ]);

    expect(map.get("head.teacher@school.ng")).toBe("head.teacher@ishaq.qa.test");
    expect(map.get("head.teacher@gmail.com")).toBe("head.teacher.2@ishaq.qa.test");
    expect(map.get("amina+admin@school.ng")).toBe("amina@ishaq.qa.test");
    expect(map.get("already@ishaq.qa.test")).toBe("already@ishaq.qa.test");
    expect(map.size).toBe(4);
    expect(new Set(map.values()).size).toBe(4);
    for (const value of map.values()) expect(isLocalQaEmail(value)).toBe(true);
  });

  test("never reuses an address that is already on the QA domain", () => {
    const map = buildLocalQaEmailMap(["ali@ishaq.qa.test", "ali@school.ng"]);
    expect(map.get("ali@school.ng")).toBe("ali.2@ishaq.qa.test");
  });

  test("falls back to a safe local part", () => {
    const map = buildLocalQaEmailMap(["@@weird", "عبد@school.ng"]);
    expect([...map.values()].every((value) => /^[a-z0-9._-]+@ishaq\.qa\.test$/.test(value))).toBe(true);
  });
});

describe("assertLocalLoopbackDatabase", () => {
  test("only allows the local profile on a loopback database", () => {
    expect(() =>
      assertLocalLoopbackDatabase({ SCHOOL_CLERK_DB_MODE: "local", DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/db" }),
    ).not.toThrow();
    expect(() =>
      assertLocalLoopbackDatabase({ SCHOOL_CLERK_DB_MODE: "prod", DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/db" }),
    ).toThrow();
    expect(() =>
      assertLocalLoopbackDatabase({ SCHOOL_CLERK_DB_MODE: "local", DATABASE_URL: "postgresql://u:p@db.example.com:5432/db" }),
    ).toThrow();
    expect(() => assertLocalLoopbackDatabase({ SCHOOL_CLERK_DB_MODE: "local" })).toThrow();
  });
});

describe("isLocalQaEmail", () => {
  test("matches only the QA domain", () => {
    expect(isLocalQaEmail("A@Ishaq.QA.test")).toBe(true);
    expect(isLocalQaEmail("a@ishaq.qa.test.evil.com")).toBe(false);
    expect(isLocalQaEmail("a@school.ng")).toBe(false);
    expect(isLocalQaEmail(null)).toBe(false);
  });
});
