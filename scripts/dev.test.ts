// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import { commandForProfile, parseArgs } from "./dev";

describe("dev script profile router", () => {
  test("defaults to local", () => {
    expect(parseArgs([])).toEqual({ profile: "local" });
  });

  test("supports remote-dev", () => {
    expect(parseArgs(["--remote-dev"])).toEqual({ profile: "remote-dev" });
    expect(commandForProfile("remote-dev")).toEqual([
      "bun",
      "scripts/with-dev-infra.ts",
      "--db",
      "remote-dev",
      "--",
      "bun",
      "scripts/dev-run.ts",
    ]);
  });

  test("supports prod", () => {
    expect(parseArgs(["--prod"])).toEqual({ profile: "prod" });
    expect(commandForProfile("prod")).toEqual([
      "./scripts/with-root-env.sh",
      "--mode",
      "production",
      "turbo",
      "dev:prod",
      "--parallel",
      "--filter",
      "@school-clerk/dashboard",
      "--filter",
      "@school-clerk/api",
    ]);
  });

  test("rejects conflicting profile flags", () => {
    expect(() => parseArgs(["--local", "--remote-dev"])).toThrow(
      "Conflicting dev flags",
    );
  });

  test("passes exact monorepo package filters through", () => {
    const options = parseArgs([
      "--filter",
      "@school-clerk/site",
      "@school-clerk/dashboard",
      "@school-clerk/jobs",
    ]);

    expect(options).toEqual({
      profile: "local",
      filters: {
        targets: [
          "@school-clerk/site",
          "@school-clerk/dashboard",
          "@school-clerk/jobs",
        ],
      },
    });
    expect(commandForProfile(options.profile, options.filters)).toEqual([
      "bun",
      "scripts/with-dev-infra.ts",
      "--db",
      "local",
      "--",
      "bun",
      "scripts/dev-run.ts",
      "--filter",
      "@school-clerk/site",
      "--filter",
      "@school-clerk/dashboard",
      "--filter",
      "@school-clerk/jobs",
    ]);
  });

  test("supports suffix exclusion syntax for monorepo filters", () => {
    const options = parseArgs([
      "--remote-dev",
      "--filter",
      "@school-clerk/api!",
      "@school-clerk/site!",
    ]);

    expect(options).toEqual({
      profile: "remote-dev",
      filters: {
        targets: ["!@school-clerk/api", "!@school-clerk/site"],
      },
    });
    expect(commandForProfile(options.profile, options.filters)).toContain(
      "!@school-clerk/api",
    );
    expect(commandForProfile(options.profile, options.filters)).toContain(
      "!@school-clerk/site",
    );
  });

  test("supports bare package-name shorthand for exact workspace packages", () => {
    const options = parseArgs(["--filter", "api", "site!", "@school-clerk/jobs"]);

    expect(options).toEqual({
      profile: "local",
      filters: {
        targets: ["@school-clerk/api", "!@school-clerk/site", "@school-clerk/jobs"],
      },
    });
  });

  test("supports filter flag aliases", () => {
    const expectedTargets = ["@school-clerk/api", "!@school-clerk/site"];

    for (const filterFlag of ["--filter", "--f", "-f", "-filter"]) {
      expect(parseArgs([filterFlag, "api", "site!"])).toEqual({
        profile: "local",
        filters: {
          targets: expectedTargets,
        },
      });
    }

    expect(parseArgs(["--filter", "api", "-f", "jobs", "--f", "site!"])).toEqual({
      profile: "local",
      filters: {
        targets: ["@school-clerk/api", "@school-clerk/jobs", "!@school-clerk/site"],
      },
    });
  });

  test("passes complex turbo selectors through without package validation", () => {
    expect(
      parseArgs([
        "--filter",
        "@school-clerk/marketing...",
        "...@school-clerk/dashboard",
        "@school-clerk/*",
        "{apps/*}",
        "[main]",
      ]),
    ).toEqual({
      profile: "local",
      filters: {
        targets: [
          "@school-clerk/marketing...",
          "...@school-clerk/dashboard",
          "@school-clerk/*",
          "{apps/*}",
          "[main]",
        ],
      },
    });
  });

  test("lists valid packages when a filter target is missing", () => {
    expect(() =>
      parseArgs(["--filter", "marketing", "@school-clerk/missing"]),
    ).toThrow(
      /Unknown dev filter packages: marketing, @school-clerk\/missing\nAvailable packages:\napps\/:\n  @school-clerk\/api[\s\S]*  @school-clerk\/site\npackages\/:\n  @school-clerk\/ai[\s\S]*  @school-clerk\/utils/,
    );
  });
});
