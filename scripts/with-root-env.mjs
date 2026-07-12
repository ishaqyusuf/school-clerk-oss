#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "..");
const defaultLocalDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";
const localHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "postgres",
]);

function parseArgs(argv) {
  const args = [...argv];
  let mode = process.env.SCHOOL_CLERK_ENV_MODE ?? "local";

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === "--") {
      break;
    }

    if (arg === "--mode") {
      mode = args.shift() ?? "";
      continue;
    }

    if (arg?.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length);
      continue;
    }

    args.unshift(arg);
    break;
  }

  return { command: args, mode };
}

function parseEnvFile(filePath) {
  const parsed = {};

  if (!existsSync(filePath)) {
    return parsed;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function envFileForMode(mode) {
  if (mode === "production") {
    return ".env.production";
  }

  if (mode === "local" || mode === "development") {
    return ".env.local";
  }

  throw new Error(`Unknown env mode "${mode}". Use "local" or "production".`);
}

function loadModeEnv(mode, cwd) {
  const modeFile = envFileForMode(mode);
  const files = [resolve(workspaceRoot, modeFile)];

  const parsed = files.reduce(
    (env, file) => ({
      ...env,
      ...parseEnvFile(file),
    }),
    {},
  );

  if (Object.keys(parsed).length > 0) {
    return parsed;
  }

  const fallbackFiles = [resolve(workspaceRoot, ".env")];

  return fallbackFiles.reduce(
    (env, file) => ({
      ...env,
      ...parseEnvFile(file),
    }),
    {},
  );
}

const { command, mode } = parseArgs(process.argv.slice(2));
const invocationCwd = process.cwd();

if (command.length === 0) {
  console.error(
    "Usage: with-root-env.sh --mode local -- <command> [args...]",
  );
  process.exit(1);
}

function splitInlineEnv(command) {
  const inlineEnv = {};
  const remaining = [...command];

  while (remaining.length > 0) {
    const arg = remaining[0];
    const match = arg.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      break;
    }

    inlineEnv[match[1]] = match[2];
    remaining.shift();
  }

  return { inlineEnv, command: remaining };
}

let fileEnv = {};

try {
  fileEnv = loadModeEnv(mode, invocationCwd);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const { inlineEnv, command: childCommand } = splitInlineEnv(command);

if (childCommand.length === 0) {
  console.error("No command provided after inline environment assignments.");
  process.exit(1);
}

const child = spawn(childCommand[0], childCommand.slice(1), {
  cwd: process.cwd(),
  env: resolveChildEnv({
    ...fileEnv,
    ...process.env,
    ...inlineEnv,
    SCHOOL_CLERK_ENV_MODE: mode === "production" ? "production" : "local",
    SCHOOL_CLERK_WORKSPACE_ROOT: workspaceRoot,
  }, mode),
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function resolveChildEnv(env, mode) {
  if (mode !== "local" && mode !== "development") {
    return env;
  }

  const databaseUrl =
    firstEnvValue(env, ["LOCAL_POSTGRES_URL", "LOCAL_DATABASE_URL"]) ??
    localEnvValue(env, "POSTGRES_URL") ??
    localEnvValue(env, "DATABASE_URL") ??
    defaultLocalDatabaseUrl;

  return {
    ...env,
    SCHOOL_CLERK_DB_MODE: "local",
    SCHOOL_CLERK_START_POSTGRES: "1",
    DATABASE_URL: databaseUrl,
    LOCAL_DATABASE_URL: databaseUrl,
  };
}

function firstEnvValue(env, keys) {
  for (const key of keys) {
    if (env[key]) {
      return env[key];
    }
  }

  return undefined;
}

function localEnvValue(env, key) {
  const value = env[key];
  return value && isLocalUrl(value) ? value : undefined;
}

function isLocalUrl(value) {
  try {
    return localHosts.has(new URL(value).hostname);
  } catch {
    return false;
  }
}
