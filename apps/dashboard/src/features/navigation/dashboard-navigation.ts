import {
	type InstitutionType,
	type NavStatus,
	type NavigationWorkspaceProfile,
	resolveNavigation,
} from "@school-clerk/navigation";
import type { ModuleId } from "@school-clerk/utils/module-config";

import { dashboardNavRegistry } from "./dashboard-nav-registry";
import { applyDashboardModulePolicy, getNavigationModuleFlags } from "./dashboard-module-policy";

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
		/** Complete effective module set from the tenant policy resolver. */
		tenantModules?: readonly ModuleId[];
		includeStatuses?: NavStatus[];
		institutionType?: InstitutionType | null;
		permissions?: Record<string, boolean>;
	} = {},
) {
	return resolveNavigation({
		enabledModules: options.tenantModules !== undefined
			? getNavigationModuleFlags(options.tenantModules)
			: options.enabledModules,
		includeStatuses: options.includeStatuses ?? ["live"],
		institutionType: options.institutionType,
		modules: options.tenantModules !== undefined
			? applyDashboardModulePolicy(dashboardNavRegistry)
			: dashboardNavRegistry,
		permissions: options.permissions,
		profiles: dashboardNavigationProfiles,
		role,
	});
}
