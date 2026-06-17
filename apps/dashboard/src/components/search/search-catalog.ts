import { dashboardNavRegistry } from "@/features/navigation/dashboard-nav-registry";
import type {
	NavItemDefinition,
	NavModuleDefinition,
} from "@school-clerk/navigation";
import type { LocalSearchItem, SearchItem } from "./search-types";

const DEFAULT_PAGE_KEYS = new Set([
	"dashboard-home",
	"students-list",
	"students-enrollment",
	"academic-classes",
	"finance-overview",
	"finance-receive-payment",
	"finance-student-balances",
	"finance-payables",
	"finance-fee-structures",
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
	"academic-subjects": [
		"subjects",
		"courses",
		"curriculum",
		"class subjects",
	],
	"finance-collections": [
		"student collections",
		"receipts",
		"payments received",
		"collection report",
		"paid fees",
	],
	"finance-fee-structures": [
		"fees management",
		"student fees",
		"fee setup",
		"tuition fees",
		"school fees",
		"fee structure",
	],
	"finance-ledger": [
		"transactions",
		"finance transactions",
		"account ledger",
	],
	"finance-payables": [
		"bills",
		"expenses",
		"supplier bills",
		"school obligations",
		"payables",
	],
	"finance-payroll-bills": [
		"payroll",
		"staff remuneration",
		"salary",
		"staff payments",
	],
	"finance-owing-repayments": [
		"owing",
		"repayments",
		"unsettled payables",
		"liabilities",
	],
	"finance-receive-payment": [
		"receive payment",
		"student payment",
		"record payment",
		"collect fees",
		"pay school fees",
	],
	"finance-service-billables": [
		"billables",
		"service billables",
		"service items",
		"expense items",
	],
	"finance-service-bills": [
		"service bills",
		"vendor bills",
		"operational bills",
		"supplier service bills",
	],
	"finance-streams": [
		"accounts",
		"streams",
		"account streams",
		"finance accounts",
	],
	"finance-student-balances": [
		"student fees",
		"student accounts",
		"student receivables",
		"outstanding fees",
		"balances",
		"debtors",
	],
	"finance-transfers": [
		"internal transfers",
		"account transfers",
		"move money",
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
	"teacher-reports": ["reports", "results", "assessment recording"],
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
		href: "/finance/receive",
		id: "action-receive-payment",
		keywords: ["receive payment", "fee payment", "collections"],
		subtitle: "Go to receive payment",
		title: "Receive a payment",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/finance/collections",
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

function flattenItems(modules: NavModuleDefinition[]) {
	const items: NavItemDefinition[] = [];

	for (const module of modules) {
		for (const section of module.sections) {
			for (const item of section.items) {
				items.push(item);
			}
		}
	}

	return items;
}

function roleAllows(roles: string[] | undefined, role?: string | null) {
	if (!roles?.length) return true;
	if (!role) return false;
	return roles.includes(role);
}

function mapNavItems(role?: string | null) {
	return flattenItems(dashboardNavRegistry)
		.filter((item) => item.status !== "hidden" && item.status !== "upcoming")
		.filter((item) => roleAllows(item.roles, role))
		.map<LocalSearchItem>((item) => ({
			group: "Pages",
			href: item.href,
			id: item.key,
			keywords: [
				item.title,
				item.module,
				item.workspace,
				item.sectionTitle || "",
				...(SEARCH_ALIASES[item.key] ?? []),
			]
				.filter(Boolean)
				.map((value) => value.toLowerCase()),
			subtitle: item.sectionTitle || item.module,
			title: item.title,
		}));
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
}) {
	const normalizedQuery = params.query
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	const navigation = mapNavItems(params.role);
	const actions = quickActions.filter((item) =>
		roleAllows(item.roles, params.role),
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
