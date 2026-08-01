import type { NavModuleDefinition } from "@school-clerk/navigation";

export const operationsNavigationModule: NavModuleDefinition = {
	icon: "package",
	key: "operations",
	requiresModules: ["inventory"],
	sections: [
		{
			items: [
				{
					href: "/inventory",
					icon: "package",
					key: "operations-inventory",
					module: "operations",
					roles: ["Admin", "Accountant"],
					section: "main",
					title: "Inventory",
					workspace: "admin",
				},
			],
			key: "main",
			title: "Operations",
		},
	],
	subtitle: "Campus Operations",
	title: "Operations",
	workspace: "admin",
};
