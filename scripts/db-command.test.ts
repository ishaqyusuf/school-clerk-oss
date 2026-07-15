// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import {
  parseArgs,
  prismaArgsForAction,
  withEnvCommandForOptions,
} from "./db-command";

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
      profile: "remote",
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
    expect(prismaArgsForAction("migrate", "remote")).toEqual([
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

  test("wraps commands in local-infra-kit env loader", () => {
    expect(
      withEnvCommandForOptions(
        {
          action: "push",
          profile: "prod",
          passthrough: [],
        },
        "/repo/school-clerk",
      ),
    ).toEqual([
      "bun",
      "/repo/local-infra-kit/bin/with-env.ts",
      "--profile",
      "school-clerk",
      "--mode",
      "prod",
      "--",
      "bunx",
      "--bun",
      "prisma",
      "db",
      "push",
    ]);
  });
});
