// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import { Icons } from "@school-clerk/ui/custom/icons";

import { dashboardNavRegistry } from "./dashboard-nav-registry";
import { resolveDashboardNavigation } from "./dashboard-navigation";

const roleCases = [
	{
		defaultHref: "/",
		modules: ["overview", "people", "academics", "finance", "settings"],
		role: "Admin",
		surface: "sidebar",
	},
	{
		defaultHref: "/teacher",
		modules: ["teacher-workspace"],
		role: "Teacher",
		surface: "compact",
	},
	{
		defaultHref: "/finance/receive",
		modules: ["finance"],
		role: "Accountant",
		surface: "sidebar",
	},
	{
		defaultHref: "/students/enrollment",
		modules: ["people"],
		role: "Registrar",
		surface: "compact",
	},
	{
		defaultHref: "/staff/non-teaching",
		modules: ["people"],
		role: "HR",
		surface: "compact",
	},
	{
		defaultHref: "/",
		modules: ["overview"],
		role: "Staff",
		surface: "compact",
	},
	{
		defaultHref: "/parents",
		modules: ["parent-portal"],
		role: "Parent",
		surface: "compact",
	},
	{
		defaultHref: "/notifications",
		modules: [],
		role: "Support",
		surface: "header-only",
	},
	{
		defaultHref: "/unavailable",
		modules: [],
		role: "Student",
		surface: "unavailable",
	},
] as const;

const expectedRoleIa: Record<string, string[]> = {
	Admin: [
		"overview::_=Dashboard@/",
		"people::Student Records=Students@/students/list,Enrollment@/students/enrollment;Staff=Teachers@/staff/teachers,Non-Teaching Staff@/staff/non-teaching,Departments@/staff/departments;Workforce=Staff Attendance@/staff/attendance",
		"academics::_=Overview@/academic;Curriculum=Classes@/academic/classes,Subjects@/academic/subjects;Assessment & Results=Assessment Recording@/assessment-recording,Class Report Sheets@/academic/reports,Student Reports@/student-report",
		"finance::_=Overview@/finance;Collections=Receive Payment@/finance/receive,Student Balances@/finance/students,Collections@/finance/collections;Payables=All Payables@/finance/payables,Payroll Bills@/finance/payables/payroll,Service Bills@/finance/payables/services,Owing & Repayments@/finance/payables/owing;Accounting=Accounts@/finance/accounts,Transfers@/finance/accounts/transfers,Ledger@/finance/ledger,Reconciliation@/finance/reconciliation;Setup=Fee Structures@/finance/setup/fees,Service Billables@/finance/setup/service-billables",
		"settings::School=School Profile@/settings/school-profile;Documents=Document Templates@/settings/document-templates;Website=Website@/settings/website[Website Media@/settings/website/media]",
	],
	Teacher: [
		"teacher-workspace::_=Overview@/teacher;Classroom Work=My Classes@/teacher/classes,My Students@/teacher/students,Attendance@/teacher/attendance;Assessment & Results=Score Entry@/assessment-recording,Reports@/teacher/reports",
	],
	Accountant: [
		"finance::Collections=Receive Payment@/finance/receive,Student Balances@/finance/students,Collections@/finance/collections;Payables=All Payables@/finance/payables,Payroll Bills@/finance/payables/payroll,Service Bills@/finance/payables/services,Owing & Repayments@/finance/payables/owing;Accounting=Transfers@/finance/accounts/transfers,Ledger@/finance/ledger,Reconciliation@/finance/reconciliation",
	],
	Registrar: [
		"people::Admissions=Enrollment@/students/enrollment;Records=Student Directory@/students/list",
	],
	HR: [
		"people::People=Non-Teaching Staff@/staff/non-teaching;Organization=Departments@/staff/departments;Workforce=Staff Attendance@/staff/attendance",
	],
	Staff: ["overview::_=Dashboard@/"],
	Parent: ["parent-portal::Family=Overview@/parents"],
	Support: [],
	Student: [],
};

function serializeRoleIa(role: string) {
	return resolveDashboardNavigation(role).modules.map(
		(module) =>
			`${module.key}::${module.sections
				.map(
					(section) =>
						`${section.title ?? "_"}=${section.items
							.map((item) => {
								const children = item.children.length
									? `[${item.children
											.map((child) => `${child.title}@${child.href}`)
											.join("|")}]`
									: "";
								return `${item.title}@${item.href}${children}`;
							})
							.join(",")}`,
				)
				.join(";")}`,
	);
}

describe("resolveDashboardNavigation", () => {
	test.each(Object.entries(expectedRoleIa))(
		"pins the exact production IA for %s",
		(role, expectedIa) => {
			expect(serializeRoleIa(role)).toEqual(expectedIa);
		},
	);

	test.each(roleCases)(
		"resolves the exact production workspace for $role",
		({ defaultHref, modules, role, surface }) => {
			const result = resolveDashboardNavigation(role);

			expect(result.surface).toBe(surface);
			expect(result.defaultHref).toBe(defaultHref);
			expect(result.modules.map((module) => module.key)).toEqual(modules);
		},
	);

	test("keeps teacher score entry and reports as separate live destinations", () => {
		const result = resolveDashboardNavigation("Teacher");
		const links = result.modules.flatMap((module) =>
			module.sections.flatMap((section) =>
				section.items.map((item) => [item.title, item.href]),
			),
		);

		expect(links).toContainEqual(["Score Entry", "/assessment-recording"]);
		expect(links).toContainEqual(["Reports", "/teacher/reports"]);
	});

	test("applies role-specific section structure without duplicating destinations", () => {
		const registrar = resolveDashboardNavigation("Registrar").modules[0];
		const hr = resolveDashboardNavigation("HR").modules[0];

		expect(
			registrar?.sections.map((section) => ({
				items: section.items.map((item) => item.title),
				title: section.title,
			})),
		).toEqual([
			{ items: ["Enrollment"], title: "Admissions" },
			{ items: ["Student Directory"], title: "Records" },
		]);
		expect(
			hr?.sections.map((section) => ({
				items: section.items.map((item) => item.title),
				title: section.title,
			})),
		).toEqual([
			{ items: ["Non-Teaching Staff"], title: "People" },
			{ items: ["Departments"], title: "Organization" },
			{ items: ["Staff Attendance"], title: "Workforce" },
		]);
	});

	test("excludes upcoming placeholders from production navigation", () => {
		const result = resolveDashboardNavigation("Admin");
		const hrefs = result.modules.flatMap((module) =>
			module.sections.flatMap((section) =>
				section.items.flatMap((item) => [
					item.href,
					...item.children.map((child) => child.href),
				]),
			),
		);

		expect(hrefs).not.toContain("/staff/payroll");
		expect(hrefs).not.toContain("/settings/sessions");
		expect(hrefs).not.toContain("/settings/roles");
	});

	test("uses renderer-backed icon keys for every registry entry", () => {
		const iconKeys = dashboardNavRegistry.flatMap((module) => [
			module.icon,
			...module.sections.flatMap((section) =>
				section.items.flatMap((item) => [
					item.icon,
					...(item.children ?? []).map((child) => child.icon),
				]),
			),
		]);

		expect(
			iconKeys.filter(Boolean).every((icon) => icon && icon in Icons),
		).toBe(true);
	});

	test("reveals Inventory only when the tenant module is explicitly enabled", () => {
		expect(
			resolveDashboardNavigation("Accountant").modules.map(
				(module) => module.key,
			),
		).toEqual(["finance"]);
		expect(
			resolveDashboardNavigation("Accountant", {
				enabledModules: ["inventory"],
			}).modules.map((module) => module.key),
		).toEqual(["finance", "operations"]);
	});
});
