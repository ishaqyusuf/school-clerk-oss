import type { NavModuleDefinition } from "@school-clerk/navigation";

/**
 * One link per everyday job (ADR-0088). Tabs inside each page come from
 * `features/finance/finance-sections.ts`; sections are spacing, not labels.
 */
export const financeNavigationModule: NavModuleDefinition = {
	icon: "wallet",
	key: "finance",
	sections: [
		{
			items: [
				{
					childPaths: ["/finance"],
					href: "/finance",
					icon: "dashboard",
					key: "finance-overview",
					module: "finance",
					roles: ["Admin", "Accountant"],
					section: "dashboard",
					title: "Overview",
					workspace: "finance-office",
				},
			],
			key: "dashboard",
		},
		{
			items: [
				{
					childPaths: ["/finance/student-payments"],
					href: "/finance/student-payments",
					icon: "billing",
					key: "finance-student-payments",
					module: "finance",
					roles: ["Admin", "Accountant"],
					section: "money-in",
					title: "Student Payments",
					workspace: "finance-office",
				},
			],
			key: "money-in",
		},
		{
			items: [
				{
					childPaths: ["/finance/salaries"],
					href: "/finance/salaries",
					icon: "users",
					key: "finance-salaries",
					module: "finance",
					roles: ["Admin", "Accountant"],
					section: "money-out",
					title: "Salaries",
					workspace: "finance-office",
				},
				{
					childPaths: ["/finance/services"],
					href: "/finance/services",
					icon: "post",
					key: "finance-services",
					module: "finance",
					roles: ["Admin", "Accountant"],
					section: "money-out",
					title: "Services",
					workspace: "finance-office",
				},
				{
					childPaths: ["/finance/purchases"],
					href: "/finance/purchases",
					icon: "package",
					key: "finance-purchases",
					module: "finance",
					roles: ["Admin", "Accountant"],
					section: "money-out",
					title: "Purchases",
					workspace: "finance-office",
				},
			],
			key: "money-out",
		},
		{
			items: [
				{
					childPaths: ["/finance/accounts"],
					href: "/finance/accounts",
					icon: "layers",
					key: "finance-accounts",
					module: "finance",
					roles: ["Admin"],
					section: "finance-admin",
					title: "Accounts",
					workspace: "finance-office",
				},
				{
					// Accountants keep transfers, transactions and term checks; the
					// balances overview is Admin-only.
					childPaths: ["/finance/accounts"],
					href: "/finance/accounts/transfers",
					icon: "layers",
					key: "finance-accounts-accountant",
					module: "finance",
					roles: ["Accountant"],
					section: "finance-admin",
					title: "Accounts",
					workspace: "finance-office",
				},
				{
					childPaths: ["/finance/settings"],
					href: "/finance/settings/fees",
					icon: "settings",
					key: "finance-settings",
					module: "finance",
					roles: ["Admin"],
					section: "finance-admin",
					title: "Settings",
					workspace: "finance-office",
				},
			],
			key: "finance-admin",
		},
	],
	subtitle: "Accounts & Finance",
	title: "Finance",
	workspace: "finance-office",
};
