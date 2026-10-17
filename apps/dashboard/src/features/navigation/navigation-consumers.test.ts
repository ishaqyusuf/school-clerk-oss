// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { getLocalSearchResults } from "../../components/search/search-catalog";
import { getFirstPermittedHref } from "../../components/sidebar/links";
import { MODULE_IDS } from "@school-clerk/utils/module-config";

// Search resolves against the scope's effective modules (ADR-0044); a tenant
// with every module enabled isolates role gating from module gating.
const allTenantModules = [...MODULE_IDS];

describe("dashboard navigation consumers", () => {
	test("uses explicit safe defaults for low-link and unavailable roles", () => {
		expect(getFirstPermittedHref({ role: "support" })).toBe("/notifications");
		expect(getFirstPermittedHref({ role: "Student" })).toBe("/unavailable");
		expect(getFirstPermittedHref({ role: "Staff" })).toBe("/");
	});

	test("search exposes only Registrar destinations resolved by navigation", () => {
		const results = getLocalSearchResults({
			limit: 50,
			query: "",
			role: "registrar",
			tenantModules: allTenantModules,
		});
		const hrefs = results.map((result) => result.href);

		expect(hrefs).toContain("/students/enrollment");
		expect(hrefs).toContain("/students/list");
		expect(hrefs).not.toContain("/staff/non-teaching");
		expect(hrefs).not.toContain("/settings/roles");
	});

	test("search withholds module-gated destinations without tenant modules", () => {
		for (const role of ["Registrar", "Teacher"]) {
			const results = getLocalSearchResults({ limit: 50, query: "", role });
			expect(results.map((result) => result.href)).toEqual(["/notifications"]);
		}

		// Dashboard and Settings sit outside module policy, so Admin keeps them.
		const adminHrefs = getLocalSearchResults({
			limit: 50,
			query: "",
			role: "Admin",
		}).map((result) => result.href);
		expect(adminHrefs).toContain("/");
		expect(adminHrefs).toContain("/settings/school-profile");
		expect(adminHrefs).not.toContain("/assistant");
		expect(adminHrefs).not.toContain("/students/list");
		expect(adminHrefs).not.toContain("/finance");
	});

	test("keeps header-only Support search scoped to global utilities", () => {
		const results = getLocalSearchResults({
			limit: 50,
			query: "",
			role: "Support",
		});

		expect(results.map((result) => result.href)).toEqual(["/notifications"]);
	});

	test("maps assessment recording search to Teacher Score Entry, not Reports", () => {
		const results = getLocalSearchResults({
			limit: 5,
			query: "assessment recording",
			role: "Teacher",
			tenantModules: allTenantModules,
		});

		expect(results[0]?.href).toBe("/assessment-recording");
		expect(results[0]?.title).toBe("Score Entry");
	});
});
