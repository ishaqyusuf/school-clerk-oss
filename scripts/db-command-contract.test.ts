import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

function scripts(path: string): Record<string, string> {
  return (JSON.parse(readFileSync(resolve(root, path), "utf8")) as {
    scripts?: Record<string, string>;
  }).scripts ?? {};
}

function workspaceScripts(): Array<[string, string]> {
  const manifests = [
    "package.json",
    ...new Bun.Glob("{apps,packages}/*/package.json").scanSync({ cwd: root }),
  ];

  return manifests.flatMap((manifest) =>
    Object.entries(scripts(manifest)).map(([name, command]) => [
      `${manifest}#${name}`,
      command,
    ]),
  );
}

describe("shared database command contract", () => {
  test("exposes one mode-aware root command per database action", () => {
    const rootScripts = scripts("package.json");
    const prefix = "bun --env-file=/dev/null ../local-infra-kit/bin/db.ts";

    for (const action of ["generate", "migrate", "pull", "push", "studio", "shell"]) {
      expect(rootScripts[`db:${action}`]).toBe(
        `${prefix} ${action} --profile school-clerk`,
      );
    }
    expect(
      Object.keys(rootScripts).filter((name) =>
        /^db:(generate|migrate|pull|push|studio|shell):/.test(name),
      ),
    ).toEqual([]);
  });

  test("keeps only raw package commands", () => {
    const packageScripts = scripts("packages/db/package.json");

    expect(packageScripts["db:generate"]).toBe("prisma generate");
    expect(packageScripts["db:migrate"]).toBe("prisma migrate dev");
    expect(packageScripts["db:migrate:deploy"]).toBe("prisma migrate deploy");
    expect(packageScripts["db:pull"]).toBe("prisma db pull");
    expect(packageScripts["db:push"]).toBe("prisma db push");
    expect(packageScripts["db:studio"]).toBe("prisma studio --port 5556");
  });

  test("exposes one production-to-destination synchronization command", () => {
    const rootScripts = scripts("package.json");
    const packageScripts = scripts("packages/db/package.json");

    expect(rootScripts["db:sync"]).toBe(
      "bun --env-file=/dev/null ../local-infra-kit/bin/db-sync.ts --profile school-clerk",
    );
    expect(packageScripts["db:sync"]).toBe(
      "bun scripts/sync-databases.ts",
    );
    expect(
      Object.keys(rootScripts).filter(
        (name) => name.startsWith("db:sync:") || name.startsWith("db:update:"),
      ),
    ).toEqual([]);
    expect(
      Object.keys(packageScripts).filter(
        (name) => name.startsWith("sync:") || name.startsWith("db:sync:"),
      ),
    ).toEqual([]);
  });

  test("has no repository-local database profile router", () => {
    expect(existsSync(resolve(root, "scripts/db-command.ts"))).toBe(false);
    expect(existsSync(resolve(root, "scripts/db-push.ts"))).toBe(false);
  });

  test("workspace consumers do not invoke removed database aliases", () => {
    for (const [consumer, command] of workspaceScripts()) {
      expect(command, consumer).not.toMatch(
        /\b(?:prisma-generate:(?:local|preview|prod)|db:(?:generate|migrate|pull|push|studio|shell):(?:local|preview|prod|dev))\b/,
      );
    }
  });

  test("Turbo has no tasks for removed database aliases", () => {
    const tasks = (
      JSON.parse(readFileSync(resolve(root, "turbo.json"), "utf8")) as {
        tasks?: Record<string, unknown>;
      }
    ).tasks ?? {};

    expect(tasks["prisma-generate"]).toBeUndefined();
    expect(tasks["db-migrate"]).toBeUndefined();
  });
});
