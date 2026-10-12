import { describe, expect, test } from "bun:test";
import {
  LOCAL_QA_EMAIL_DOMAIN,
  getDevelopmentLoginUser,
  listDevelopmentLoginUsers,
} from "./development-access";

function captureUserQueries() {
  const calls: Array<{ where: Record<string, unknown> }> = [];
  const db = {
    user: {
      findFirst: (args: { where: Record<string, unknown> }) => {
        calls.push(args);
        return Promise.resolve(null);
      },
      findMany: (args: { where: Record<string, unknown> }) => {
        calls.push(args);
        return Promise.resolve([]);
      },
    },
    schoolProfile: {},
  };
  return { calls, db: db as never };
}

describe("passwordless local login eligibility", () => {
  test("only matches QA-domain identities in the requested school", async () => {
    const { calls, db } = captureUserQueries();
    await getDevelopmentLoginUser(db, { schoolId: "school-1", userId: "user-1" });
    await listDevelopmentLoginUsers(db, "school-1");

    for (const { where } of calls) {
      expect(where.email).toEqual({
        endsWith: `@${LOCAL_QA_EMAIL_DOMAIN}`,
        mode: "insensitive",
      });
      expect(JSON.stringify(where.tenant)).toContain("school-1");
      expect(where.deletedAt).toBeNull();
    }
    expect(calls[0]?.where.id).toBe("user-1");
  });
});
