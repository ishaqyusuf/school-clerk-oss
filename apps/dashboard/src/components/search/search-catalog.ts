import { resolveDashboardNavigation } from "@/features/navigation/dashboard-navigation";
import {
	type ResolvedNavigation,
	normalizeNavigationRole,
} from "@school-clerk/navigation";
import type { LocalSearchItem, SearchItem } from "./search-types";
import type { ModuleId } from "@school-clerk/utils/module-config";

const DEFAULT_PAGE_KEYS = new Set([
	"dashboard-home",
	"students-list",
	"students-enrollment",
	"academic-classes",
	"finance-overview",
	"finance-student-payments",
	"finance-salaries",
	"finance-services",
	"finance-purchases",
	"staff-teachers",
]);

const SEARCH_ALIASES: Record<string, string[]> = {
	"academic-classes": [
		"classes",
		"classrooms",
		"class rooms",
		"streams",
		"arms",
		"class arms",
		"manage classes",
	],
	"academic-student-report": [
		"student report",
		"results",
		"report cards",
		"print results",
		"terminal report",
	],
	"academic-subjects": ["subjects", "courses", "curriculum", "class subjects"],
	"finance-student-payments": [
		"receive payment",
		"student payment",
		"record payment",
		"collect fees",
		"pay school fees",
		"student balances",
		"who owes",
		"debtors",
		"outstanding fees",
		"collections",
		"receipts",
	],
	"finance-salaries": [
		"payroll",
		"payroll bills",
		"salary",
		"staff pay",
		"staff payments",
		"wages",
	],
	"finance-services": [
		"service bills",
		"vendor bills",
		"payables",
		"bills",
		"expenses",
		"owing",
		"unpaid bills",
	],
	"finance-purchases": [
		"purchase",
		"stationery",
		"uniform stock",
		"supplies",
		"bought",
	],
	"finance-accounts": [
		"accounts",
		"streams",
		"balances",
		"ledger",
		"transactions",
		"transfers",
		"move money",
		"reconciliation",
		"close term",
	],
	"finance-accounts-accountant": [
		"accounts",
		"ledger",
		"transactions",
		"transfers",
		"move money",
		"reconciliation",
		"close term",
	],
	"finance-settings": [
		"fee structures",
		"fees management",
		"school fees",
		"fee setup",
		"service billables",
		"billables",
		"expense items",
	],
	notifications: ["alerts", "messages", "bell", "inbox"],
	"staff-attendance": ["staff attendance", "teacher attendance"],
	"staff-payroll": ["payroll", "salary", "staff bills"],
	"students-enrollment": ["enroll student", "admission", "new student"],
	"students-list": [
		"students",
		"student list",
		"student records",
		"student profiles",
	],
	"teacher-attendance": ["attendance", "mark attendance", "class attendance"],
	"teacher-classes": ["my classes", "classrooms", "teacher classes"],
	"teacher-reports": ["reports", "results", "report sheets"],
	"teacher-score-entry": [
		"assessment recording",
		"score entry",
		"record scores",
		"enter results",
	],
	"teacher-students": ["my students", "student records"],
};

const quickActions: Array<LocalSearchItem & { roles?: string[] }> = [
	{
		group: "Quick Actions",
		href: "/students/enrollment",
		id: "action-enroll-student",
		keywords: ["enroll student", "new admission", "student enrollment"],
		subtitle: "Open enrollment workspace",
		title: "Enroll a student",
		roles: ["Admin", "Registrar"],
	},
	{
		group: "Quick Actions",
		href: "/students/list",
		id: "action-import-students",
		keywords: ["import students", "bulk import", "paste students"],
		subtitle: "Open student list and import tools",
		title: "Import students",
		roles: ["Admin"],
	},
	{
		group: "Quick Actions",
		href: "/academic/classes?createClassroom=true",
		id: "action-add-classroom",
		keywords: ["add classroom", "new class", "create class", "add stream"],
		subtitle: "Create a classroom or stream",
		title: "Add a classroom",
		roles: ["Admin"],
	},
	{
		group: "Quick Actions",
		href: "/finance/student-payments?receivePayment=true",
		id: "action-receive-payment",
		keywords: ["receive payment", "fee payment", "collections"],
		subtitle: "Open the receive payment form",
		title: "Receive a payment",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/finance/salaries?paySalaries=true",
		id: "action-pay-salaries",
		keywords: ["pay salaries", "payroll", "pay staff", "salary"],
		subtitle: "Pay staff salaries that are due",
		title: "Pay salaries",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/finance/services?recordExpense=SERVICE",
		id: "action-pay-service",
		keywords: ["pay service", "pay bill", "diesel", "internet", "repairs", "expense"],
		subtitle: "Record a payment for work or a service",
		title: "Pay for a service",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/finance/purchases?recordExpense=PURCHASE",
		id: "action-record-purchase",
		keywords: ["purchase", "buy", "stationery", "uniform stock", "supplies"],
		subtitle: "Record something the school bought",
		title: "Record a purchase",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/finance/student-payments/history",
		id: "action-review-collections",
		keywords: ["collections", "review collections", "payments received"],
		subtitle: "Review student payment collections",
		title: "Review collections",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/academic/classes",
		id: "action-manage-classes",
		keywords: ["classes", "classrooms", "academic classes"],
		subtitle: "Open class management",
		title: "Manage classes",
		roles: ["Admin"],
	},
	{
		group: "Quick Actions",
		href: "/academic/subjects",
		id: "action-manage-subjects",
		keywords: ["subjects", "courses", "manage subjects", "curriculum"],
		subtitle: "Open subject management",
		title: "Manage subjects",
		roles: ["Admin"],
	},
	{
		group: "Quick Actions",
		href: "/student-report",
		id: "action-open-student-report",
		keywords: ["student report", "results", "report cards", "print results"],
		subtitle: "Open student report workspace",
		title: "Open student report",
		roles: ["Admin"],
	},
	{
		group: "Quick Actions",
		href: "/staff/teachers",
		id: "action-open-staff",
		keywords: ["teachers", "staff", "manage teachers"],
		subtitle: "Review staff records",
		title: "Review staff",
		roles: ["Admin", "HR"],
	},
];

function roleAllows(roles: string[] | undefined, role?: string | null) {
	if (!roles?.length) return true;
	const normalizedRole = normalizeNavigationRole(role);
	return normalizedRole ? roles.includes(normalizedRole) : false;
}

function mapNavItems(navigation: ResolvedNavigation) {
	const items: LocalSearchItem[] = [];

	for (const module of navigation.modules) {
		for (const section of module.sections) {
			for (const item of section.items) {
				for (const destination of [item, ...item.children]) {
					items.push({
						group: "Pages",
						href: destination.href,
						id: destination.key,
						keywords: [
							destination.title,
							module.title,
							section.title || "",
							...(SEARCH_ALIASES[destination.key] ?? []),
						]
							.filter(Boolean)
							.map((value) => value.toLowerCase()),
						subtitle: section.title || module.title,
						title: destination.title,
					});
				}
			}
		}
	}

	const role = navigation.role;
	if (role) {
		items.push({
			group: "Pages",
			href: "/notifications",
			id: "notifications",
			keywords: ["notifications", ...(SEARCH_ALIASES.notifications ?? [])],
			subtitle: "Global",
			title: "Notifications",
		});
	}

	return items;
}

function scoreLocalItem(item: LocalSearchItem, normalizedQuery: string) {
	if (!normalizedQuery) {
		return DEFAULT_PAGE_KEYS.has(item.id)
			? 120
			: item.group === "Quick Actions"
				? 110
				: 80;
	}

	const haystack = [item.title, item.subtitle || "", ...item.keywords]
		.join(" ")
		.toLowerCase();
	const title = item.title.toLowerCase();

	if (title === normalizedQuery) return 500;
	if (title.startsWith(normalizedQuery)) return 320;
	if (haystack.includes(normalizedQuery)) return 180;

	return 0;
}

export function getLocalSearchResults(params: {
	limit?: number;
	query: string;
	role?: string | null;
	tenantModules?: readonly ModuleId[];
}) {
	if (!["ADMIN", "TEACHER", "ACCOUNTANT", "REGISTRAR", "HR", "STAFF", "SUPPORT", "PARENT"].includes(params.role?.trim().toUpperCase() ?? "")) return [];
	const normalizedQuery = params.query
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	const resolvedNavigation = resolveDashboardNavigation(params.role, { tenantModules: params.tenantModules ?? [] });
	const navigation = mapNavItems(resolvedNavigation);
	const allowedHrefs = new Set(navigation.map((item) => item.href));
	const actions = quickActions.filter(
		(item) =>
			roleAllows(item.roles, params.role) &&
			allowedHrefs.has(item.href.split("?", 1)[0] ?? item.href),
	);

	return [...navigation, ...actions]
		.map<SearchItem>((item) => ({
			href: item.href,
			id: item.id,
			group: item.group,
			rank: scoreLocalItem(item, normalizedQuery),
			subtitle: item.subtitle,
			title: item.title,
			type: item.group === "Pages" ? "page" : "action",
		}))
		.filter((item) => item.rank > 0)
		.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
		.slice(0, params.limit ?? 12);
}
