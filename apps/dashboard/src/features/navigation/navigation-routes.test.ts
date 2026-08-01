// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveDashboardNavigation } from "./dashboard-navigation";

const sidebarRoot = fileURLToPath(
	new URL("../../app/[domain]/(sidebar)", import.meta.url),
);

function collectPageFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory()
			? collectPageFiles(path)
			: entry.name === "page.tsx"
				? [path]
				: [];
	});
}

function routeFromPageFile(file: string) {
	const segments = relative(sidebarRoot, file)
		.split(sep)
		.filter((segment) => segment !== "page.tsx")
		.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
	return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

describe("dashboard navigation routes", () => {
	test("backs every live resolved destination with a page", () => {
		const pageRoutes = new Set(
			collectPageFiles(sidebarRoot).map(routeFromPageFile),
		);
		const roles = [
			"Admin",
			"Teacher",
			"Accountant",
			"Registrar",
			"HR",
			"Staff",
			"Parent",
			"Support",
			"Student",
		];
		const liveHrefs = new Set(
			[
				...roles.map((role) => resolveDashboardNavigation(role)),
				resolveDashboardNavigation("Admin", {
					enabledModules: ["inventory"],
				}),
			].flatMap((navigation) => {
				return [
					navigation.defaultHref,
					...navigation.modules.flatMap((module) =>
						module.sections.flatMap((section) =>
							section.items.flatMap((item) => [
								item.href,
								...item.children.map((child) => child.href),
							]),
						),
					),
				];
			}),
		);

		expect([...liveHrefs].filter((href) => !pageRoutes.has(href))).toEqual([]);
	});
});
