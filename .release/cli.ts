#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const revision = "ec653d87eb0b65bbac9235680d85eed6fdfd20a1";
const repository = resolve(import.meta.dir, "..");
const command = Bun.argv[2];
const executable = command === "check" ? "bin/release-ci.ts" : "bin/release.ts";
const args = command === "check"
  ? ["--env", Bun.argv[4], "--repo", repository]
  : [command, ...Bun.argv.slice(3), "--repo", repository];

if (!["plan", "status", "check"].includes(command ?? "") ||
    command === "check" && (Bun.argv[3] !== "--env" ||
      !["preview", "production"].includes(Bun.argv[4] ?? "") || Bun.argv.length !== 5)) {
  console.error("Use release:plan|status|check --env preview|production.");
  process.exit(2);
}

const result = spawnSync("bun", [resolve(import.meta.dir, "toolkit", revision, executable),
  ...args.filter((arg): arg is string => typeof arg === "string")], {
  cwd: repository,
  stdio: "inherit",
});
process.exit(result.status ?? 2);
