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
	"finance-payments",
	"staff-teachers",
]);

const quickActions: Array<LocalSearchItem & { roles?: string[] }> = [
	{
		group: "Quick Actions",
		href: "/students/enrollment",
		id: "action-enroll-student",
		keywords: ["enroll student", "new admission", "student enrollment"],
		subtitle: "Open enrollment workspace",
		title: "Enroll a student",
	},
	{
		group: "Quick Actions",
		href: "/finance/payments",
		id: "action-receive-payment",
		keywords: ["receive payment", "fee payment", "collections"],
		subtitle: "Go to payments",
		title: "Receive a payment",
		roles: ["Admin", "Accountant"],
	},
	{
		group: "Quick Actions",
		href: "/academic/classes",
		id: "action-manage-classes",
		keywords: ["classes", "classrooms", "academic classes"],
		subtitle: "Open class management",
		title: "Manage classes",
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
