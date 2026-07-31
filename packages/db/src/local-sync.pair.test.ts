import { describe, expect, test } from "bun:test";
import { parseSyncPairMode, syncPairModes } from "./local-sync";

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
});
