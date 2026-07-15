#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type DbAction = "generate" | "migrate" | "pull" | "push" | "studio";
type DbProfile = "local" | "remote" | "prod";

type DbCommandCliOptions = {
  action: DbAction;
  profile: DbProfile;
  passthrough: string[];
};

const ACTIONS = new Set<DbAction>([
  "generate",
  "migrate",
  "pull",
  "push",
  "studio",
]);

const PROFILE_FLAGS = new Map<string, DbProfile>([
  ["--local", "local"],
  ["--remote", "remote"],
  ["--remote-dev", "remote"],
  ["--prod", "prod"],
]);

export function parseArgs(argv: string[]): DbCommandCliOptions {
  const action = argv[0] as DbAction | undefined;

  if (!action || !ACTIONS.has(action)) {
    throw new Error(
      `Missing or invalid DB action. Use one of: ${[...ACTIONS].join(", ")}.`,
    );
  }

  let profile: DbProfile = "local";
  let explicitProfile: DbProfile | undefined;
  const passthrough: string[] = [];
  let index = 1;

  while (index < argv.length) {
    const arg = argv[index];

    if (!arg) {
      break;
    }

    if (arg === "--") {
      passthrough.push(...argv.slice(index + 1));
      break;
    }

    const nextProfile = PROFILE_FLAGS.get(arg);

    if (!nextProfile) {
      throw new Error(
        `Unknown db:${action} flag: ${arg}. Use --local, --remote, --remote-dev, --prod, or -- for Prisma args.`,
      );
    }

    if (explicitProfile && explicitProfile !== nextProfile) {
      throw new Error(
        `Conflicting db:${action} flags. Choose only one DB profile.`,
      );
    }

    explicitProfile = nextProfile;
    profile = nextProfile;
    index += 1;
  }

  return { action, profile, passthrough };
}

export function prismaArgsForAction(
  action: DbAction,
  profile: DbProfile,
): string[] {
  switch (action) {
    case "generate":
      return ["prisma", "generate"];
    case "migrate":
      return profile === "prod"
        ? ["prisma", "migrate", "deploy"]
        : ["prisma", "migrate", "dev"];
    case "pull":
      return ["prisma", "db", "pull"];
    case "push":
      return ["prisma", "db", "push"];
    case "studio":
      return ["prisma", "studio", "--port", "5556"];
  }
}

export function prismaCommandForOptions(options: DbCommandCliOptions): string[] {
  return [
    "bunx",
    "--bun",
    ...prismaArgsForAction(options.action, options.profile),
    ...options.passthrough,
  ];
}

export function withEnvCommandForOptions(
  options: DbCommandCliOptions,
  workspaceRoot: string,
): string[] {
  return [
    "bun",
    resolve(workspaceRoot, "../local-infra-kit/bin/with-env.ts"),
    "--profile",
    "school-clerk",
    "--mode",
    options.profile,
    "--",
    ...prismaCommandForOptions(options),
  ];
}

function findWorkspaceRoot(startDir: string): string {
  let currentDir = resolve(startDir);

  while (true) {
    const packageJsonPath = resolve(currentDir, "package.json");

    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        workspaces?: unknown;
      };

      if (Array.isArray(packageJson.workspaces)) {
        return currentDir;
      }
    }

    const parentDir = resolve(currentDir, "..");

    if (parentDir === currentDir) {
      throw new Error(`Could not find a workspace root from ${startDir}.`);
    }

    currentDir = parentDir;
  }
}

async function run(command: string[], options: { cwd: string }) {
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function main() {
  const options = parseArgs(Bun.argv.slice(2));
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const dbPackageDir = resolve(workspaceRoot, "packages/db");
  const withEnvPath = resolve(workspaceRoot, "../local-infra-kit/bin/with-env.ts");

  if (!existsSync(dbPackageDir)) {
    throw new Error(`Could not find DB package at ${dbPackageDir}.`);
  }

  if (!existsSync(withEnvPath)) {
    throw new Error(`Could not find local-infra-kit env wrapper at ${withEnvPath}.`);
  }

  if (options.profile === "local" && options.action !== "generate") {
    await run(
      [
        "bun",
        withEnvPath,
        "--profile",
        "school-clerk",
        "--mode",
        "local",
        "--",
        "bun",
        "run",
        "dev:services",
      ],
      {
        cwd: workspaceRoot,
      },
    );
  }

  await run(withEnvCommandForOptions(options, workspaceRoot), {
    cwd: dbPackageDir,
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
