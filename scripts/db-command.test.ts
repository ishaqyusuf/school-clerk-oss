// @ts-expect-error Bun test types are not included by the root TypeScript config.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	envForOptions,
	parseArgs,
	prismaArgsForAction,
	prismaCommandForOptions,
} from "./db-command";

describe("db command router", () => {
	test("defaults DB commands to local", () => {
		expect(parseArgs(["push"])).toEqual({
			action: "push",
			profile: "local",
			passthrough: [],
		});
	});

	test("supports remote alias", () => {
		expect(parseArgs(["migrate", "--remote"])).toEqual({
			action: "migrate",
			profile: "remote",
			passthrough: [],
		});
	});

	test("passes Prisma args after separator", () => {
		expect(parseArgs(["push", "--local", "--", "--accept-data-loss"])).toEqual({
			action: "push",
			profile: "local",
			passthrough: ["--accept-data-loss"],
		});
	});

	test("rejects conflicting profile flags", () => {
		expect(() => parseArgs(["push", "--local", "--prod"])).toThrow(
			"Conflicting db:push flags",
		);
	});

	test("maps migrate to deploy in production only", () => {
		expect(prismaArgsForAction("migrate", "local")).toEqual([
			"prisma",
			"migrate",
			"dev",
		]);
		expect(prismaArgsForAction("migrate", "remote")).toEqual([
			"prisma",
			"migrate",
			"dev",
		]);
		expect(prismaArgsForAction("migrate", "prod")).toEqual([
			"prisma",
			"migrate",
			"deploy",
		]);
	});

	test("builds direct Prisma command without env-mode wrapper", () => {
		expect(
			prismaCommandForOptions({
				action: "push",
				profile: "prod",
				passthrough: [],
			}),
		).toEqual(["bunx", "--bun", "prisma", "db", "push"]);
	});

	test("pins production DATABASE_URL over local env file", () => {
		const root = mkdtempSync(join(tmpdir(), "school-clerk-db-command-"));

		try {
			writeFileSync(
				join(root, ".env.local"),
				"DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/school_clerk\n",
			);
			writeFileSync(
				join(root, ".env.prod"),
				"DATABASE_URL=postgresql://prod.example.com/school_clerk\n",
			);

			const env = envForOptions(
				{ action: "push", profile: "prod", passthrough: [] },
				root,
			);

			expect(env.DATABASE_URL).toBe(
				"postgresql://prod.example.com/school_clerk",
			);
			expect(env.SCHOOL_CLERK_DB_MODE).toBe("prod");
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	});

	test("refuses production push with local DATABASE_URL", () => {
		const root = mkdtempSync(join(tmpdir(), "school-clerk-db-command-"));

		try {
			writeFileSync(
				join(root, ".env.prod"),
				"DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/school_clerk\n",
			);

			expect(() =>
				envForOptions(
					{ action: "push", profile: "prod", passthrough: [] },
					root,
				),
			).toThrow("Refusing to run db:push --prod with a local DATABASE_URL");
		} finally {
			rmSync(root, { force: true, recursive: true });
		}
	});
});
