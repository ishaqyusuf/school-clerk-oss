import type { NavModuleDefinition } from "@school-clerk/navigation";

export const overviewNavigationModule: NavModuleDefinition = {
	icon: "school",
	key: "overview",
	sections: [
		{
			items: [
				{
					href: "/assistant",
					icon: "dashboard",
					key: "assistant",
					module: "overview",
					roles: ["Admin"],
					section: "main",
					title: "Assistant",
					workspace: "admin",
				},
				{
					childPaths: ["/dashboard"],
					href: "/",
					icon: "dashboard",
					key: "dashboard-home",
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
	subtitle: "School Management",
	title: "Overview",
	workspace: "admin",
};
