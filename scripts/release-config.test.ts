import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { validateReleaseConfig } from "../../local-infra-kit/src/release-flow/config";
import {
	componentPathspecs,
	componentSourceDirs,
} from "../../local-infra-kit/src/release-flow/state";
import config from "../release.config";

const root = resolve(import.meta.dir, "..");
const release = validateReleaseConfig(config);

function component(name: string) {
	const found = release.components.find((entry) => entry.name === name);
	if (!found) throw new Error(`Missing release component: ${name}`);
	return found;
}

describe("School Clerk shared release integration", () => {
	test("uses confirmed Vercel projects and includes the embedded API", () => {
		expect(component("dashboard").vercel?.projects).toEqual([
			"schoolclerk-dashboard",
		]);
		expect(component("marketing").vercel?.projects).toEqual(["schoolify"]);
		expect(componentSourceDirs(root, component("dashboard"))).toContain(
			"apps/api",
		);
	});

	test("database and jobs cannot deploy through Preview", () => {
		const database = component("database");
		expect(database.environments).toEqual(["production"]);
		expect(database.deploy?.preview).toBeUndefined();
		expect(database.deploy?.production).toBe("bun run db:push --prod");
		expect(database.beforePush).toBe(true);
		expect(component("jobs").environments).toEqual(["production"]);
		expect(component("jobs").deploy?.preview).toBeUndefined();
	});

	test("student query changes do not cause a schema push", () => {
		const database = component("database");
		const paths = componentPathspecs(
			release,
			database,
			componentSourceDirs(root, database),
		);
		const changed = execFileSync(
			"git",
			[
				"diff",
				"--name-only",
				"d6f43f046309438f960f33834dece32bc5272ed2",
				"9959495894585ff2f22db17c73afb1d18b7e711c",
				"--",
				...paths,
			],
			{ cwd: root, encoding: "utf8" },
		);
		expect(changed.trim()).toBe("");
		expect(database.sharedPaths).toBe(false);
	});
});
