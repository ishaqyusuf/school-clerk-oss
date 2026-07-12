import { describe, expect, test } from "bun:test";
import { commandForProfile, parseArgs } from "./db-push";

describe("db:push script profile router", () => {
  test("defaults to local", () => {
    expect(parseArgs([])).toEqual({ profile: "local" });
  });

  test("supports local", () => {
    const options = parseArgs(["--local"]);

    expect(options).toEqual({ profile: "local" });
    expect(commandForProfile(options.profile)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "DEV_PROFILE=local",
      "SCHOOL_CLERK_DB_MODE=local",
      "bun",
      "run",
      "--cwd",
      "packages/db",
      "push",
    ]);
  });

  test("supports prod with production database guard", () => {
    const options = parseArgs(["--prod"]);

    expect(options).toEqual({ profile: "prod" });
    expect(commandForProfile(options.profile)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "APP_ENV=production",
      "REQUIRE_PROD_DATABASE_URL=1",
      "bun",
      "run",
      "--cwd",
      "packages/db",
      "push",
    ]);
  });

  test("supports remote-dev", () => {
    const options = parseArgs(["--remote-dev"]);

    expect(options).toEqual({ profile: "remote-dev" });
    expect(commandForProfile(options.profile)).toEqual([
      "node",
      "./scripts/with-workspace-env.mjs",
      "APP_ENV=remote-dev",
      "DEV_PROFILE=remote-dev",
      "SCHOOL_CLERK_DB_MODE=remote-dev",
      "bun",
      "run",
      "--cwd",
      "packages/db",
      "push",
    ]);
  });

  test("supports remote as a remote-dev alias", () => {
    expect(parseArgs(["--remote"])).toEqual({ profile: "remote-dev" });
  });

  test("rejects conflicting profile flags", () => {
    expect(() => parseArgs(["--local", "--remote"])).toThrow(
      "Conflicting db:push flags",
    );
  });

  test("rejects unknown flags", () => {
    expect(() => parseArgs(["--staging"])).toThrow("Unknown db:push flag");
  });
});
