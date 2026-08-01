import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const componentsDirectory = join(
  process.cwd(),
  "apps/dashboard/src/components",
);
const clientComponents = ["open-student-import.tsx", "open-student-sheet.tsx"];

describe("student header client boundaries", () => {
  for (const file of clientComponents) {
    it(`${file} declares a client boundary before invoking client hooks`, () => {
      const source = readFileSync(join(componentsDirectory, file), "utf8");

      expect(source).toMatch(/^\s*["']use client["'];/);
    });
  }
});
