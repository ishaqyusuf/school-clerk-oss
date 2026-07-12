// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import { commandForOptions, parseArgs, prismaArgsForAction } from "./db-command";

describe("db command router", () => {
  test("defaults DB commands to local", () => {
    expect(parseArgs(["push"])).toEqual({
      action: "push",
      profile: "local",
      passthrough: [],
    });
  });

  test("supports remote alias", () => {
    expect(parseArgs(["migrate", "--remote"])).toEqual({
      action: "migrate",
      profile: "remote-dev",
      passthrough: [],
    });
  });

  test("passes Prisma args after separator", () => {
    expect(parseArgs(["push", "--local", "--", "--accept-data-loss"])).toEqual({
      action: "push",
      profile: "local",
      passthrough: ["--accept-data-loss"],
    });
  });

  test("rejects conflicting profile flags", () => {
    expect(() => parseArgs(["push", "--local", "--prod"])).toThrow(
      "Conflicting db:push flags",
    );
  });

  test("maps migrate to deploy in production only", () => {
    expect(prismaArgsForAction("migrate", "local")).toEqual([
      "prisma",
      "migrate",
      "dev",
    ]);
    expect(prismaArgsForAction("migrate", "remote-dev")).toEqual([
      "prisma",
      "migrate",
      "dev",
    ]);
    expect(prismaArgsForAction("migrate", "prod")).toEqual([
      "prisma",
      "migrate",
      "deploy",
    ]);
  });

  test("wraps production commands in production env loader", () => {
    expect(
      commandForOptions({
        action: "push",
        profile: "prod",
        passthrough: [],
      }),
    ).toEqual([
      "./scripts/with-root-env.sh",
      "--mode",
      "production",
      "SCHOOL_CLERK_DB_COMMAND_PROD_CHILD=1",
      "bun",
      "scripts/db-command.ts",
      "push",
      "--prod",
    ]);
  });
});
