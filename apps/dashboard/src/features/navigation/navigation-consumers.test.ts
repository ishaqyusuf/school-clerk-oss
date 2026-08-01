// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import { getLocalSearchResults } from "../../components/search/search-catalog";
import { getFirstPermittedHref } from "../../components/sidebar/links";

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
		});
		const hrefs = results.map((result) => result.href);

		expect(hrefs).toContain("/students/enrollment");
		expect(hrefs).toContain("/students/list");
		expect(hrefs).not.toContain("/staff/non-teaching");
		expect(hrefs).not.toContain("/settings/roles");
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
		});

		expect(results[0]?.href).toBe("/assessment-recording");
		expect(results[0]?.title).toBe("Score Entry");
	});
});
