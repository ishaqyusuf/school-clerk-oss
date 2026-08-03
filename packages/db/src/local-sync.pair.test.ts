import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSyncPairMode, resolveOptions, syncPairModes } from "./local-sync";

describe("School Clerk sync pair modes", () => {
  test("supports local to preview without enabling production destinations", () => {
    expect(parseSyncPairMode("local-preview")).toBe("local-preview");
    expect(syncPairModes("local-preview")).toEqual({
      sourceMode: "local",
      targetMode: "preview",
    });
    expect(() => parseSyncPairMode("local-prod")).toThrow("Unknown sync mode");
    expect(() => parseSyncPairMode("constructor")).toThrow("Unknown sync mode");
  });

  test("does not use the local database URL when the preview URL is missing", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "school-clerk-db-sync-"));
    const previousTargetUrl = process.env.TARGET_DATABASE_URL;
    Reflect.deleteProperty(process.env, "TARGET_DATABASE_URL");

    try {
      await writeFile(
        join(repoRoot, ".env.local"),
        "DATABASE_URL=postgresql://local-user@localhost:55432/school_clerk\n",
      );

      await expect(
        resolveOptions(
          [
            "--mode",
            "local-preview",
            "--source-url",
            "postgresql://local-user@localhost:55432/school_clerk",
          ],
          repoRoot,
        ),
      ).rejects.toThrow("Missing target database URL. Set DATABASE_URL in .env.preview");
    } finally {
      if (previousTargetUrl === undefined) {
        Reflect.deleteProperty(process.env, "TARGET_DATABASE_URL");
      } else {
        process.env.TARGET_DATABASE_URL = previousTargetUrl;
      }
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});
