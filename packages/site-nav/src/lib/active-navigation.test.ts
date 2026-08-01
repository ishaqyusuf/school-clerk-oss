import { describe, expect, test } from "bun:test";
import type { ResolvedNavModule } from "@school-clerk/navigation";

import { findActiveNavigation } from "./active-navigation";

const modules = [
	{
		defaultHref: "/finance",
		icon: "wallet",
		key: "finance",
		sections: [
			{
				items: [
					{
						childPaths: ["/finance"],
						children: [],
						href: "/finance",
						icon: "dashboard",
						key: "finance-overview",
						status: "live",
						title: "Overview",
					},
					{
						childPaths: ["/finance/accounts"],
						children: [
							{
								childPaths: [],
								children: [],
								href: "/finance/accounts/transfers",
								icon: "transactions",
								key: "finance-transfers",
								status: "live",
								title: "Transfers",
							},
						],
						href: "/finance/accounts",
						icon: "layers",
						key: "finance-accounts",
						status: "live",
						title: "Accounts",
					},
				],
				key: "main",
				title: "Finance",
			},
		],
		title: "Finance",
		workspace: "finance-office",
	},
] satisfies ResolvedNavModule[];

describe("findActiveNavigation", () => {
	test("prefers an exact child destination over broader parent matches", () => {
		const result = findActiveNavigation("/finance/accounts/transfers", modules);

		expect(result?.module.key).toBe("finance");
		expect(result?.item.key).toBe("finance-accounts");
		expect(result?.child?.key).toBe("finance-transfers");
	});

	test("uses the longest matching child path for detail routes", () => {
		const result = findActiveNavigation("/finance/accounts/account-1", modules);

		expect(result?.item.key).toBe("finance-accounts");
		expect(result?.child).toBeNull();
	});

	test("resolves duplicate hrefs deterministically by module order", () => {
		const duplicate = {
			...modules[0],
			key: "operations",
			sections: [
				{
					items: [
						{
							childPaths: [],
							children: [],
							href: "/finance",
							icon: "dashboard",
							key: "duplicate-finance",
							status: "live",
							title: "Duplicate",
						},
					],
					key: "main",
				},
			],
			title: "Operations",
		} satisfies ResolvedNavModule;

		expect(
			findActiveNavigation("/finance", [modules[0], duplicate])?.module.key,
		).toBe("finance");
	});
});
