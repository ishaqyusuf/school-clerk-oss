#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type DevDatabaseMode = "remote-dev" | "local";

type DevInfraCliOptions = {
  dbMode?: DevDatabaseMode;
  command: string[];
};

type ResolveDevInfraOptions = {
  dbMode?: DevDatabaseMode;
};

const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "postgres",
]);

export function parseEnvText(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2];

    if (!key || value == null) {
      continue;
    }

    values[key] = stripWrappingQuotes(value.trim());
  }

  return values;
}

export function loadEnvFiles(files: string[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const file of files) {
    try {
      Object.assign(values, parseEnvText(readFileSync(file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return values;
}

export function findWorkspaceRoot(startDir: string): string {
  let dir = resolve(startDir);

  while (true) {
    try {
      const packageJson = JSON.parse(
        readFileSync(resolve(dir, "package.json"), "utf8"),
      ) as { workspaces?: unknown };

      if (packageJson.workspaces) {
        return dir;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const parent = dirname(dir);

    if (parent === dir) {
      return resolve(startDir);
    }

    dir = parent;
  }
}

export function envFilesForCwd(cwd: string): string[] {
  const workspaceRoot = findWorkspaceRoot(cwd);
  const resolvedCwd = resolve(cwd);
  const files = [
    resolve(workspaceRoot, ".env"),
    resolve(workspaceRoot, ".env.local"),
  ];

  if (resolvedCwd !== workspaceRoot) {
    files.push(resolve(resolvedCwd, ".env"), resolve(resolvedCwd, ".env.local"));
  }

  return files;
}

export function resolveDevInfraEnv(
  inputEnv: Record<string, string | undefined>,
  options: ResolveDevInfraOptions = {},
): Record<string, string | undefined> {
  const dbMode = normalizeMode(
    options.dbMode ?? inputEnv.SCHOOL_CLERK_DB_MODE ?? "remote-dev",
    "SCHOOL_CLERK_DB_MODE",
  );
  const env: Record<string, string | undefined> = { ...inputEnv };

  const databaseUrl =
    dbMode === "local"
      ? firstEnvValue(env, ["LOCAL_POSTGRES_URL", "LOCAL_DATABASE_URL"]) ??
        localEnvValue(env, "POSTGRES_URL") ??
        localEnvValue(env, "DATABASE_URL") ??
        DEFAULT_LOCAL_DATABASE_URL
      : firstEnvValue(env, [
          "REMOTE_DEV_POSTGRES_URL",
          "DEV_POSTGRES_URL",
          "REMOTE_DEV_DATABASE_URL",
          "DEV_DATABASE_URL",
        ]) ??
        nonLocalEnvValue(env, "POSTGRES_URL") ??
        nonLocalEnvValue(env, "DATABASE_URL");

  if (!databaseUrl) {
    throw new Error(
      "Missing remote dev database URL. Set REMOTE_DEV_POSTGRES_URL, REMOTE_DEV_DATABASE_URL, DEV_POSTGRES_URL, DEV_DATABASE_URL, POSTGRES_URL, or DATABASE_URL.",
    );
  }

  const directUrl =
    dbMode === "local"
      ? firstEnvValue(env, ["LOCAL_DIRECT_URL"]) ??
        localEnvValue(env, "DIRECT_URL") ??
        databaseUrl
      : firstEnvValue(env, ["REMOTE_DEV_DIRECT_URL", "DEV_DIRECT_URL"]) ??
        nonLocalEnvValue(env, "DIRECT_URL") ??
        databaseUrl;

  env.SCHOOL_CLERK_DB_MODE = dbMode;
  env.SCHOOL_CLERK_START_POSTGRES = dbMode === "local" ? "1" : "auto";
  env.POSTGRES_URL = databaseUrl;
  env.DATABASE_URL = databaseUrl;
  env.DIRECT_URL = directUrl;

  if (dbMode === "local") {
    env.LOCAL_POSTGRES_URL = databaseUrl;
    env.LOCAL_DATABASE_URL = databaseUrl;
    env.LOCAL_DIRECT_URL = directUrl;
  } else {
    env.REMOTE_DEV_POSTGRES_URL = databaseUrl;
    env.REMOTE_DEV_DATABASE_URL = databaseUrl;
    env.REMOTE_DEV_DIRECT_URL = directUrl;
  }

  return env;
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function firstEnvValue(
  env: Record<string, string | undefined>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = env[key];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function nonLocalEnvValue(
  env: Record<string, string | undefined>,
  key: string,
): string | undefined {
  const value = env[key];
  return value && !isLocalUrl(value) ? value : undefined;
}

function localEnvValue(
  env: Record<string, string | undefined>,
  key: string,
): string | undefined {
  const value = env[key];
  return value && isLocalUrl(value) ? value : undefined;
}

function isLocalUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return LOCAL_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function normalizeMode(value: string, name: string): DevDatabaseMode {
  if (value === "remote-dev" || value === "local") {
    return value;
  }

  throw new Error(`Invalid ${name} value: ${value}. Expected remote-dev or local.`);
}

function parseCliArgs(argv: string[]): DevInfraCliOptions {
  const options: DevInfraCliOptions = { command: [] };
  let index = 0;

  while (index < argv.length) {
    const arg = argv[index];

    if (!arg) {
      break;
    }

    if (arg === "--") {
      options.command = argv.slice(index + 1);
      break;
    }

    const next = () => {
      index += 1;
      const value = argv[index];

      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }

      return value;
    };

    switch (arg) {
      case "--db":
        options.dbMode = normalizeMode(next(), "SCHOOL_CLERK_DB_MODE");
        break;
      default:
        options.command = argv.slice(index);
        index = argv.length;
        continue;
    }

    index += 1;
  }

  if (options.command.length === 0) {
    throw new Error(
      "Missing command. Use: bun scripts/with-dev-infra.ts [--db mode] -- <command>",
    );
  }

  return options;
}

async function main() {
  const cli = parseCliArgs(Bun.argv.slice(2));
  const fileEnv = loadEnvFiles(envFilesForCwd(process.cwd()));
  const env = resolveDevInfraEnv(
    {
      ...fileEnv,
      ...process.env,
    },
    {
      dbMode: cli.dbMode,
    },
  );
  const child = Bun.spawn(cli.command, {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  process.exit(await child.exited);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
