import { describe, expect, test } from "bun:test";

import { resolveNavigation } from "./resolve";
import type { NavModuleDefinition, NavigationWorkspaceProfile } from "./types";

const modules: NavModuleDefinition[] = [
	{
		icon: "school",
		key: "overview",
		sections: [
			{
				items: [
					{
						href: "/",
						icon: "dashboard",
						key: "dashboard",
						module: "overview",
						roles: ["Admin", "Staff"],
						section: "main",
						title: "Dashboard",
						workspace: "admin",
					},
				],
				key: "main",
			},
		],
		title: "Overview",
		workspace: "admin",
	},
	{
		icon: "users",
		key: "people",
		sections: [
			{
				items: [
					{
						href: "/students/list",
						icon: "users",
						key: "students-list",
						module: "people",
						roles: ["Admin", "Registrar"],
						section: "records",
						title: "Students",
						workspace: "admin",
					},
					{
						href: "/students/enrollment",
						icon: "user-plus",
						key: "students-enrollment",
						module: "people",
						roles: ["Admin", "Registrar"],
						section: "records",
						title: "Enrollment",
						workspace: "admin",
					},
				],
				key: "records",
				title: "Student Records",
			},
		],
		title: "People",
		workspace: "admin",
	},
];

const profiles: NavigationWorkspaceProfile[] = [
	{
		defaultHref: "/students/enrollment",
		key: "registrar",
		moduleOrder: ["people"],
		roles: ["Registrar"],
		surface: "compact",
	},
];

describe("resolveNavigation", () => {
	test("returns the ordered, role-safe workspace with an explicit surface and default", () => {
		const result = resolveNavigation({
			includeStatuses: ["live"],
			modules,
			profiles,
			role: "registrar",
		});

		expect(result.surface).toBe("compact");
		expect(result.defaultHref).toBe("/students/enrollment");
		expect(result.modules.map((module) => module.key)).toEqual(["people"]);
		expect(
			result.modules.flatMap((module) =>
				module.sections.flatMap((section) =>
					section.items.map((item) => item.href),
				),
			),
		).toEqual(["/students/list", "/students/enrollment"]);
	});

	test("intersects role, permission, institution, module, and status policies", () => {
		const guardedModules: NavModuleDefinition[] = [
			{
				icon: "package",
				key: "operations",
				requiresModules: ["inventory"],
				roles: ["Admin"],
				sections: [
					{
						items: [
							{
								href: "/inventory",
								icon: "package",
								institutionTypes: ["PRIMARY"],
								key: "inventory",
								module: "operations",
								permissions: ["inventory.view"],
								section: "main",
								title: "Inventory",
								workspace: "admin",
							},
							{
								href: "/inventory/beta",
								key: "inventory-beta",
								module: "operations",
								section: "main",
								status: "beta",
								title: "Inventory Beta",
								workspace: "admin",
							},
						],
						key: "main",
					},
				],
				title: "Operations",
				workspace: "admin",
			},
		];
		const guardedProfiles: NavigationWorkspaceProfile[] = [
			{
				defaultHref: "/inventory",
				key: "admin",
				moduleOrder: ["operations"],
				roles: ["Admin"],
				surface: "sidebar",
			},
		];
		const result = resolveNavigation({
			enabledModules: ["INVENTORY"],
			includeStatuses: ["live"],
			institutionType: "PRIMARY",
			modules: guardedModules,
			permissions: { "INVENTORY.VIEW": true },
			profiles: guardedProfiles,
			role: "admin",
		});

		expect(
			result.modules[0]?.sections[0]?.items.map((item) => item.href),
		).toEqual(["/inventory"]);
		const unavailable = resolveNavigation({
			enabledModules: [],
			institutionType: "PRIMARY",
			modules: guardedModules,
			permissions: { "inventory.view": true },
			profiles: guardedProfiles,
			role: "Admin",
		});
		expect(unavailable.modules).toEqual([]);
		expect(unavailable.surface).toBe("unavailable");
		expect(unavailable.defaultHref).toBe("/unavailable");
	});

	test("does not replace an inherited role policy with a child role policy", () => {
		const conflictingModules: NavModuleDefinition[] = [
			{
				icon: "school",
				key: "overview",
				roles: ["Admin"],
				sections: [
					{
						items: [
							{
								href: "/conflict",
								key: "conflict",
								module: "overview",
								roles: ["Teacher"],
								section: "main",
								title: "Conflict",
								workspace: "admin",
							},
						],
						key: "main",
					},
				],
				title: "Overview",
				workspace: "admin",
			},
		];
		const result = resolveNavigation({
			modules: conflictingModules,
			profiles: [
				{
					defaultHref: "/conflict",
					key: "admin",
					moduleOrder: ["overview"],
					roles: ["Admin"],
					surface: "sidebar",
				},
			],
			role: "Admin",
		});

		expect(result.modules).toEqual([]);
	});
});
