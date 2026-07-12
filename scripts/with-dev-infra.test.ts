// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { envFilesForCwd, loadEnvFiles, resolveDevInfraEnv } from "./with-dev-infra";

const BASE_ENV = {
  REMOTE_DEV_DATABASE_URL:
    "postgresql://remote-user:secret@db.remote-dev.supabase.co:5432/postgres",
  LOCAL_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk",
};

describe("with-dev-infra env resolver", () => {
  test("local DB exports local PostgreSQL env and starts Docker Postgres", () => {
    const env = resolveDevInfraEnv(BASE_ENV, { dbMode: "local" });

    expect(env.DATABASE_URL).toBe(BASE_ENV.LOCAL_DATABASE_URL);
    expect(env.LOCAL_DATABASE_URL).toBe(BASE_ENV.LOCAL_DATABASE_URL);
    expect(env.POSTGRES_URL).toBeUndefined();
    expect(env.DIRECT_URL).toBeUndefined();
    expect(env.SCHOOL_CLERK_START_POSTGRES).toBe("1");
    expect(env.SCHOOL_CLERK_DB_MODE).toBe("local");
  });

  test("remote dev DB exports remote PostgreSQL env and does not force Docker", () => {
    const env = resolveDevInfraEnv(BASE_ENV, { dbMode: "remote-dev" });

    expect(env.DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
    expect(env.REMOTE_DEV_DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
    expect(env.POSTGRES_URL).toBeUndefined();
    expect(env.DIRECT_URL).toBeUndefined();
    expect(env.SCHOOL_CLERK_START_POSTGRES).toBe("auto");
    expect(env.SCHOOL_CLERK_DB_MODE).toBe("remote-dev");
  });

  test("remote dev ignores local primary and direct URL fallbacks", () => {
    const env = resolveDevInfraEnv(
      {
        DATABASE_URL: BASE_ENV.LOCAL_DATABASE_URL,
        REMOTE_DEV_DATABASE_URL:
          "postgresql://remote-user:secret@pooler.supabase.com:6543/postgres",
      },
      { dbMode: "remote-dev" },
    );

    expect(env.DATABASE_URL).toBe(
      "postgresql://remote-user:secret@pooler.supabase.com:6543/postgres",
    );
    expect(env.POSTGRES_URL).toBeUndefined();
  });

  test("local DB ignores remote database fallback", () => {
    const env = resolveDevInfraEnv(
      {
        ...BASE_ENV,
        DATABASE_URL:
          "postgresql://remote-user:secret@db.remote-dev.supabase.co:5432/postgres",
      },
      { dbMode: "local" },
    );

    expect(env.DATABASE_URL).toBe(BASE_ENV.LOCAL_DATABASE_URL);
  });

  test("package cwd env loading uses root env only", () => {
    const root = mkdtempSync(join(tmpdir(), "school-clerk-env-"));
    const packageDir = join(root, "packages", "jobs");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ private: true, workspaces: ["packages/*"] }),
    );
    writeFileSync(
      join(root, ".env.local"),
      [
        "SCHOOL_CLERK_DB_MODE=remote-dev",
        `REMOTE_DEV_DATABASE_URL=${BASE_ENV.REMOTE_DEV_DATABASE_URL}`,
        `LOCAL_DATABASE_URL=${BASE_ENV.LOCAL_DATABASE_URL}`,
      ].join("\n"),
    );
    writeFileSync(join(packageDir, ".env.local"), "TRIGGER_PROJECT_ID=dev_project\n");

    const env = loadEnvFiles(envFilesForCwd(packageDir));

    expect(env.REMOTE_DEV_DATABASE_URL).toBe(BASE_ENV.REMOTE_DEV_DATABASE_URL);
    expect(env.TRIGGER_PROJECT_ID).toBeUndefined();
  });
});
