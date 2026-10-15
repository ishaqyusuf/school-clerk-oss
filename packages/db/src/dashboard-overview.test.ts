import { describe, expect, test } from "bun:test";

import { dashboardDayKey, termWeekProgress } from "./dashboard-overview";

describe("dashboardDayKey", () => {
	test("uses the school's calendar day, not UTC", () => {
		// 23:30 UTC on 14 Oct is already 15 Oct in Lagos (UTC+1).
		expect(dashboardDayKey(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-15");
		expect(dashboardDayKey(new Date("2026-10-15T08:00:00Z"))).toBe("2026-10-15");
	});
});

describe("termWeekProgress", () => {
	const term = {
		startDate: new Date("2026-09-14T00:00:00Z"),
		endDate: new Date("2026-12-11T00:00:00Z"),
	};

	test("returns null without term dates", () => {
		expect(termWeekProgress(null, new Date())).toBeNull();
		expect(termWeekProgress({ startDate: null, endDate: term.endDate }, new Date())).toBeNull();
	});

	test("places today inside the term", () => {
		expect(termWeekProgress(term, new Date("2026-10-15T09:00:00Z"))).toEqual({
			currentWeek: 5,
			totalWeeks: 13,
			daysLeft: 57,
		});
	});

	test("clamps before and after the term", () => {
		expect(termWeekProgress(term, new Date("2026-09-01T00:00:00Z"))?.currentWeek).toBe(1);
		const after = termWeekProgress(term, new Date("2027-01-10T00:00:00Z"));
		expect(after?.currentWeek).toBe(13);
		expect(after?.daysLeft).toBe(0);
	});
});
