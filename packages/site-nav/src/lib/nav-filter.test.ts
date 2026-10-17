import { describe, expect, test } from "bun:test";
import type {
	ResolvedNavItem,
	ResolvedNavModule,
} from "@school-clerk/navigation";

import { filterNavigation, splitNavMatch } from "./nav-filter";

function item(
	key: string,
	title: string,
	children: ResolvedNavItem[] = [],
): ResolvedNavItem {
	return {
		childPaths: [],
		children,
		href: `/${key}`,
		icon: null,
		key,
		status: "live",
		title,
	};
}

const modules = [
	{
		defaultHref: "/finance",
		icon: "wallet",
		key: "finance",
		sections: [
			{ items: [item("finance", "Overview")], key: "dashboard" },
			{
				items: [
					item("receive", "Receive Payment"),
					item("payables", "All Payables"),
				],
				key: "collections",
				title: "Collections",
			},
		],
		title: "Finance",
		workspace: "finance-office",
	},
	{
		defaultHref: "/settings",
		icon: "settings",
		key: "settings",
		sections: [
			{
				items: [
					item("website", "Website", [
						item("website-media", "Website Media"),
						item("website-pages", "Pages"),
					]),
				],
				key: "website",
				title: "Website",
			},
		],
		title: "Settings",
		workspace: "admin",
	},
] satisfies ResolvedNavModule[];

describe("filterNavigation", () => {
	test("keeps every module, section and child without a query", () => {
		const groups = filterNavigation(modules, "  ");

		expect(groups.map((group) => group.key)).toEqual(["finance", "settings"]);
		expect(groups[0].sections).toHaveLength(2);
		expect(groups[1].sections[0].items[0].children).toHaveLength(2);
	});

	test("matches item titles case-insensitively and drops empty sections and modules", () => {
		const groups = filterNavigation(modules, "PAY");

		expect(groups.map((group) => group.key)).toEqual(["finance"]);
		expect(groups[0].sections.map((section) => section.key)).toEqual([
			"collections",
		]);
		expect(groups[0].sections[0].items.map((entry) => entry.item.key)).toEqual([
			"receive",
			"payables",
		]);
	});

	test("a child match keeps its parent with only the matching children", () => {
		const [settings] = filterNavigation(modules, "media");

		expect(settings.key).toBe("settings");
		expect(settings.sections[0].items[0].item.key).toBe("website");
		expect(
			settings.sections[0].items[0].children.map((child) => child.key),
		).toEqual(["website-media"]);
	});

	test("a module title match keeps the whole module", () => {
		const [finance] = filterNavigation(modules, "finan");

		expect(finance.sections.flatMap((section) => section.items)).toHaveLength(
			3,
		);
	});

	test("returns nothing when no destination matches", () => {
		expect(filterNavigation(modules, "zzz")).toEqual([]);
	});
});

describe("splitNavMatch", () => {
	test("splits around the first match and preserves original casing", () => {
		expect(splitNavMatch("Receive Payment", "pay")).toEqual({
			after: "ment",
			before: "Receive ",
			match: "Pay",
		});
	});

	test("returns null without a query or match", () => {
		expect(splitNavMatch("Ledger", "")).toBeNull();
		expect(splitNavMatch("Ledger", "pay")).toBeNull();
	});
});
