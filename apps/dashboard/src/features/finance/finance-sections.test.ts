import { describe, expect, test } from "bun:test";
import { financeNavigationModule } from "@/features/navigation/dashboard-nav-modules/finance";
import { applyDashboardModulePolicy } from "@/features/navigation/dashboard-module-policy";
import { redirectTargetWithSearch } from "@/app/[domain]/(sidebar)/finance/redirect-with-search";
import {
	financeLegacyRedirects,
	financeSections,
	visibleFinanceTabs,
} from "./finance-sections";

const financeHrefs = new Set(
	Object.values(financeSections).flatMap((section) =>
		section.tabs.map((tab) => tab.href),
	),
);

describe("finance sections", () => {
	test("every old Finance URL lands on a current tab", () => {
		for (const [from, to] of Object.entries(financeLegacyRedirects)) {
			expect({ from, landsOnTab: financeHrefs.has(to) }).toEqual({
				from,
				landsOnTab: true,
			});
		}
	});

	test("redirects keep the query string", async () => {
		await expect(
			redirectTargetWithSearch(financeLegacyRedirects["/finance/receive"], {
				receivePayment: "true",
				tag: ["a", "b"],
			}),
		).resolves.toBe("/finance/student-payments?receivePayment=true&tag=a&tag=b");
	});

	test("every sidebar link opens a section tab", () => {
		const hrefs = financeNavigationModule.sections
			.flatMap((section) => section.items)
			.map((item) => item.href)
			.filter((href) => href !== "/finance");
		for (const href of hrefs) expect(financeHrefs.has(href)).toBe(true);
	});

	test("hides Admin-only tabs from Accountants", () => {
		expect(visibleFinanceTabs("accounts", "Admin").map((tab) => tab.label)).toEqual([
			"Balances",
			"Money moved",
			"All transactions",
			"Close term",
		]);
		expect(
			visibleFinanceTabs("accounts", "Accountant").map((tab) => tab.label),
		).toEqual(["Money moved", "All transactions", "Close term"]);
	});

	test("every Finance link declares a module policy, so configured tenants see it", () => {
		const keys = (module: typeof financeNavigationModule) =>
			module.sections.flatMap((section) => section.items.map((item) => item.key));
		const [withPolicy] = applyDashboardModulePolicy([financeNavigationModule]);
		expect(withPolicy && keys(withPolicy)).toEqual(keys(financeNavigationModule));
	});
});
