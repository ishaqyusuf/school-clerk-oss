import { describe, expect, test } from "bun:test";

import { getLatestReportPrintStatus } from "./report-print-history";

describe("report print history", () => {
	test("returns the latest print date for each requested term form", () => {
		const firstPrint = new Date("2026-07-24T08:00:00.000Z");
		const secondPrint = new Date("2026-07-25T09:00:00.000Z");

		expect(
			getLatestReportPrintStatus({
				logs: [
					{
						printedAt: firstPrint,
						termFormIds: ["student-a", "student-b"],
					},
					{
						printedAt: secondPrint,
						termFormIds: ["student-a"],
					},
				],
				requestedTermFormIds: ["student-a", "student-b", "student-pending"],
			}),
		).toEqual({
			"student-a": secondPrint,
			"student-b": firstPrint,
		});
	});

	test("does not expose unrequested students from the same print batch", () => {
		const printedAt = new Date("2026-07-25T09:00:00.000Z");

		expect(
			getLatestReportPrintStatus({
				logs: [
					{
						printedAt,
						termFormIds: ["requested", "not-requested"],
					},
				],
				requestedTermFormIds: ["requested"],
			}),
		).toEqual({ requested: printedAt });
	});
});
