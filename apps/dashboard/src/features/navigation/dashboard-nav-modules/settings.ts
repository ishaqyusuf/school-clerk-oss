import type { NavModuleDefinition } from "@school-clerk/navigation";

export const settingsNavigationModule: NavModuleDefinition = {
	icon: "settings",
	key: "settings",
	sections: [
		{
			items: [
				{
					href: "/settings/school-profile",
					icon: "settings",
					key: "settings-school-profile",
					module: "settings",
					roles: ["Admin"],
					section: "school",
					title: "School Profile",
					workspace: "admin",
				},
				{
					href: "/settings/sessions",
					icon: "calendar",
					key: "settings-sessions",
					module: "settings",
					roles: ["Admin"],
					section: "school",
					status: "upcoming",
					title: "Academic Session",
					workspace: "admin",
				},
			],
			key: "school",
			title: "School",
		},
		{
			items: [
				{
					href: "/settings/roles",
					icon: "shield",
					key: "settings-roles",
					module: "settings",
					roles: ["Admin"],
					section: "access",
					status: "upcoming",
					title: "Roles & Permissions",
					workspace: "admin",
				},
			],
			key: "access",
			title: "Access",
		},
		{
			items: [
				{
					href: "/settings/document-templates",
					icon: "post",
					key: "settings-document-templates",
					module: "settings",
					roles: ["Admin"],
					section: "documents",
					title: "Document Templates",
					workspace: "admin",
				},
			],
			key: "documents",
			title: "Documents",
		},
		{
			items: [
				{
					children: [
						{
							href: "/settings/website/media",
							icon: "image",
							key: "settings-website-media",
							module: "settings",
							roles: ["Admin"],
							section: "website",
							title: "Website Media",
							workspace: "admin",
						},
					],
					childPaths: ["/settings/website"],
					href: "/settings/website",
					icon: "globe",
					key: "settings-website",
					module: "settings",
					roles: ["Admin"],
					section: "website",
					title: "Website",
					workspace: "admin",
				},
			],
			key: "website",
			title: "Website",
		},
	],
	subtitle: "Configuration",
	title: "Settings",
	workspace: "admin",
};
