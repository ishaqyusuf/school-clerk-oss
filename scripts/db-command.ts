#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  envFilesForCwd,
  findWorkspaceRoot,
  loadEnvFiles,
  resolveDevInfraEnv,
  type DevDatabaseMode,
} from "./with-dev-infra";

type DbAction = "generate" | "migrate" | "pull" | "push" | "studio";
type DbProfile = DevDatabaseMode | "prod";

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
  ["--remote", "remote-dev"],
  ["--remote-dev", "remote-dev"],
  ["--prod", "prod"],
]);

const PROD_CHILD_ENV = "SCHOOL_CLERK_DB_COMMAND_PROD_CHILD";

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

export function commandForOptions(options: DbCommandCliOptions): string[] {
  if (options.profile === "prod" && process.env[PROD_CHILD_ENV] !== "1") {
    return [
      "./scripts/with-root-env.sh",
      "--mode",
      "production",
      PROD_CHILD_ENV + "=1",
      "bun",
      "scripts/db-command.ts",
      options.action,
      "--prod",
      ...(options.passthrough.length > 0 ? ["--", ...options.passthrough] : []),
    ];
  }

  return [
    "bunx",
    "--bun",
    ...prismaArgsForAction(options.action, options.profile),
    ...options.passthrough,
  ];
}

function isLocalDatabaseUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    return new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "postgres"]).has(
      new URL(value).hostname,
    );
  } catch {
    return false;
  }
}

function normalizePgConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (
    sslMode &&
    ["prefer", "require", "verify-ca"].includes(sslMode) &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function normalizeDatabaseEnv<TEnv extends Record<string, string | undefined>>(
  env: TEnv,
): TEnv {
  const next = { ...env };
  const value = next.DATABASE_URL;

  if (value) {
    next.DATABASE_URL = normalizePgConnectionString(value);
  }

  return next;
}

function productionEnv() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing production DATABASE_URL.");
  }

  if (isLocalDatabaseUrl(databaseUrl)) {
    throw new Error(
      "Refusing to run a production DB command against a local database URL.",
    );
  }

  return normalizeDatabaseEnv({
    ...process.env,
    DATABASE_URL: databaseUrl,
  });
}

function developmentEnv(profile: DevDatabaseMode, workspaceRoot: string) {
  const fileEnv = loadEnvFiles(envFilesForCwd(workspaceRoot));

  return normalizeDatabaseEnv(resolveDevInfraEnv(
    {
      ...fileEnv,
      ...process.env,
    },
    { dbMode: profile },
  ));
}

async function run(command: string[], options: { cwd: string; env: typeof process.env }) {
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    env: options.env,
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

  if (!existsSync(dbPackageDir)) {
    throw new Error(`Could not find DB package at ${dbPackageDir}.`);
  }

  if (options.profile === "prod" && process.env[PROD_CHILD_ENV] !== "1") {
    await run(commandForOptions(options), {
      cwd: workspaceRoot,
      env: process.env,
    });
    return;
  }

  const env =
    options.profile === "prod"
      ? productionEnv()
      : developmentEnv(options.profile, workspaceRoot);

  if (options.profile === "local" && options.action !== "generate") {
    await run(["bun", "run", "dev:services:local"], {
      cwd: workspaceRoot,
      env,
    });
  }

  await run(commandForOptions(options), {
    cwd: dbPackageDir,
    env,
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
