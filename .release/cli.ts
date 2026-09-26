#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repository = resolve(import.meta.dir, "..");
const lock = JSON.parse(
  readFileSync(resolve(repository, ".release/toolkit.lock.json"), "utf8"),
) as { toolkitRevision?: string };
const revision = lock.toolkitRevision;
if (!revision || !/^[0-9a-f]{40}$/i.test(revision)) {
  console.error("Release toolkit lock is invalid.");
  process.exit(2);
}
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

const result = Bun.spawnSync(["bun", resolve(import.meta.dir, "toolkit", revision, executable),
  ...args.filter((arg): arg is string => typeof arg === "string")], {
  cwd: repository,
  env: process.env,
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(result.exitCode);
