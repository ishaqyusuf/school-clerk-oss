import {
	type InstitutionType,
	type NavStatus,
	type NavigationWorkspaceProfile,
	resolveNavigation,
} from "@school-clerk/navigation";

import { dashboardNavRegistry } from "./dashboard-nav-registry";

export const dashboardNavigationProfiles: NavigationWorkspaceProfile[] = [
	{
		defaultHref: "/",
		key: "admin",
		moduleOrder: [
			"overview",
			"people",
			"academics",
			"finance",
			"operations",
			"settings",
		],
		roles: ["Admin"],
		surface: "sidebar",
	},
	{
		defaultHref: "/teacher",
		key: "teacher",
		moduleOrder: ["teacher-workspace"],
		roles: ["Teacher"],
		surface: "compact",
	},
	{
		defaultHref: "/finance/receive",
		key: "finance-office",
		moduleOrder: ["finance", "operations"],
		roles: ["Accountant"],
		surface: "sidebar",
	},
	{
		defaultHref: "/students/enrollment",
		key: "registrar",
		moduleOrder: ["people"],
		presentation: [
			{
				key: "people",
				sections: [
					{
						items: [{ key: "students-enrollment" }],
						key: "admissions",
						title: "Admissions",
					},
					{
						items: [{ key: "students-list", title: "Student Directory" }],
						key: "records",
						title: "Records",
					},
				],
			},
		],
		roles: ["Registrar"],
		surface: "compact",
	},
	{
		defaultHref: "/staff/non-teaching",
		key: "people",
		moduleOrder: ["people"],
		presentation: [
			{
				key: "people",
				sections: [
					{
						items: [{ key: "staff-non-teaching" }],
						key: "people",
						title: "People",
					},
					{
						items: [{ key: "staff-departments" }],
						key: "organization",
						title: "Organization",
					},
					{
						items: [{ key: "staff-attendance" }],
						key: "workforce",
						title: "Workforce",
					},
				],
			},
		],
		roles: ["HR"],
		surface: "compact",
	},
	{
		defaultHref: "/",
		key: "staff",
		moduleOrder: ["overview"],
		roles: ["Staff"],
		surface: "compact",
	},
	{
		defaultHref: "/parents",
		key: "parent",
		moduleOrder: ["parent-portal"],
		roles: ["Parent"],
		surface: "compact",
	},
	{
		defaultHref: "/notifications",
		key: "support",
		moduleOrder: [],
		roles: ["Support"],
		surface: "header-only",
	},
	{
		defaultHref: "/unavailable",
		key: "student",
		moduleOrder: [],
		roles: ["Student"],
		surface: "unavailable",
	},
];

export function resolveDashboardNavigation(
	role?: string | null,
	options: {
		enabledModules?: Iterable<string>;
		includeStatuses?: NavStatus[];
		institutionType?: InstitutionType | null;
		permissions?: Record<string, boolean>;
	} = {},
) {
	return resolveNavigation({
		enabledModules: options.enabledModules,
		includeStatuses: options.includeStatuses ?? ["live"],
		institutionType: options.institutionType,
		modules: dashboardNavRegistry,
		permissions: options.permissions,
		profiles: dashboardNavigationProfiles,
		role,
	});
}
