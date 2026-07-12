import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";
import { applyDatabaseProfile } from "../../scripts/database-profile.mjs";

const placeholderDatabaseUrl =
  "postgresql://school_clerk:school_clerk@localhost:5432/school_clerk";
const __filename = fileURLToPath(import.meta.url);
const workspaceDir = path.dirname(__filename);
const repoRoot = path.resolve(workspaceDir, "../..");

function mergeEnvFile(filePath: string, targetEnv: NodeJS.ProcessEnv) {
  if (!existsSync(filePath)) {
    return;
  }

  const parsed = parseEnv(readFileSync(filePath, "utf8"));

  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      targetEnv[key] = value;
    }
  }
}

function loadEnv() {
  const loadedEnv = { ...process.env };
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.APP_ENV === "production";
  const isRemoteDev =
    process.env.APP_ENV === "remote-dev" ||
    process.env.DEV_PROFILE === "remote-dev" ||
    process.env.SCHOOL_CLERK_DB_MODE === "remote-dev";
  const envFiles = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.development"),
    ...(!isRemoteDev && !isProduction
      ? [
          path.join(repoRoot, ".env.local"),
          path.join(repoRoot, ".env.development.local"),
        ]
      : []),
    ...(isRemoteDev
      ? [
          path.join(repoRoot, ".env.remote-dev"),
          path.join(repoRoot, ".env.remote-dev.local"),
        ]
      : []),
    ...(isProduction
      ? [
          path.join(repoRoot, ".env.production"),
          path.join(repoRoot, ".env.production.local"),
        ]
      : []),
  ];

  for (const filePath of envFiles) {
    mergeEnvFile(filePath, loadedEnv);
  }

  applyDatabaseProfile(loadedEnv);

  for (const [key, value] of Object.entries(loadedEnv)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv();

function isCodegenCommand() {
  return process.argv.some((arg) => arg === "generate" || arg === "validate");
}

function databaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (isCodegenCommand()) {
    return placeholderDatabaseUrl;
  }

  return env("DATABASE_URL");
}

export default defineConfig({
  schema: "./src/schema",
  datasource: {
    url: databaseUrl(),
  },
});
