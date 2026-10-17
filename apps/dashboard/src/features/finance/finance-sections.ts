import type { Role } from "@school-clerk/navigation";

/**
 * Finance is organised as one sidebar link per everyday job (ADR-0088).
 * Each section owns its tabs; the sidebar and the tab strip both read this list.
 */
export type FinanceSectionKey =
	| "student-payments"
	| "salaries"
	| "services"
	| "purchases"
	| "accounts"
	| "settings";

export type FinanceTab = {
	href: string;
	label: string;
	/** Hidden from everyone else. Pages still enforce access server-side. */
	roles?: Role[];
};

export type FinanceSection = {
	href: string;
	title: string;
	tabs: FinanceTab[];
};

export const financeSections: Record<FinanceSectionKey, FinanceSection> = {
	"student-payments": {
		href: "/finance/student-payments",
		title: "Student Payments",
		tabs: [
			{ href: "/finance/student-payments", label: "Receive" },
			{ href: "/finance/student-payments/class", label: "By class" },
			{ href: "/finance/student-payments/owing", label: "Who owes" },
			{ href: "/finance/student-payments/history", label: "History" },
		],
	},
	salaries: {
		href: "/finance/salaries",
		title: "Salaries",
		tabs: [
			{ href: "/finance/salaries", label: "To pay" },
			{ href: "/finance/salaries/history", label: "Paid" },
			{
				href: "/finance/salaries/setup",
				label: "Staff pay setup",
				roles: ["Admin"],
			},
		],
	},
	services: {
		href: "/finance/services",
		title: "Services",
		tabs: [
			{ href: "/finance/services", label: "All bills" },
			{ href: "/finance/services/unpaid", label: "Everything unpaid" },
		],
	},
	purchases: {
		href: "/finance/purchases",
		title: "Purchases",
		tabs: [
			{ href: "/finance/purchases", label: "All" },
			{ href: "/finance/purchases/school-use", label: "For school use" },
			{ href: "/finance/purchases/resale", label: "To sell to students" },
		],
	},
	accounts: {
		href: "/finance/accounts",
		title: "Accounts",
		tabs: [
			{ href: "/finance/accounts", label: "Balances", roles: ["Admin"] },
			{ href: "/finance/accounts/transfers", label: "Money moved" },
			{ href: "/finance/accounts/transactions", label: "All transactions" },
			{ href: "/finance/accounts/close-term", label: "Close term" },
		],
	},
	settings: {
		href: "/finance/settings/fees",
		title: "Finance settings",
		tabs: [
			{ href: "/finance/settings/fees", label: "What students pay" },
			{
				href: "/finance/settings/expense-items",
				label: "What the school pays for",
			},
		],
	},
};

export function visibleFinanceTabs(
	section: FinanceSectionKey,
	role: string | null | undefined,
) {
	const normalized = (role ?? "").toLowerCase();
	return financeSections[section].tabs.filter(
		(tab) =>
			!tab.roles || tab.roles.some((allowed) => allowed.toLowerCase() === normalized),
	);
}

/** Old Finance URLs and where they now live. Query strings are kept. */
export const financeLegacyRedirects = {
	"/finance/receive": "/finance/student-payments",
	"/finance/receive/class": "/finance/student-payments/class",
	"/finance/students": "/finance/student-payments/owing",
	"/finance/student-fees": "/finance/student-payments/owing",
	"/finance/collections": "/finance/student-payments/history",
	"/finance/payables": "/finance/services/unpaid",
	"/finance/payables/owing": "/finance/services/unpaid",
	"/finance/bills": "/finance/services/unpaid",
	"/finance/payables/services": "/finance/services",
	"/finance/payables/payroll": "/finance/salaries",
	"/finance/payments": "/finance/salaries",
	"/finance/streams": "/finance/accounts",
	"/finance/internal-transfers": "/finance/accounts/transfers",
	"/finance/ledger": "/finance/accounts/transactions",
	"/finance/transactions": "/finance/accounts/transactions",
	"/finance/reconciliation": "/finance/accounts/close-term",
	"/finance/setup/fees": "/finance/settings/fees",
	"/finance/fees-management": "/finance/settings/fees",
	"/finance/setup/service-billables": "/finance/settings/expense-items",
	"/finance/billables": "/finance/settings/expense-items",
} as const satisfies Record<string, string>;
