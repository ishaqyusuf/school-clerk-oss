import { describe, expect, test } from "bun:test";
import { saveAcademicTermDraftSchema } from "./academic-term-setup";

describe("saveAcademicTermDraftSchema", () => {
	test("accepts an unscheduled term draft", () => {
		const result = saveAcademicTermDraftSchema.parse({
			termId: "term-1",
			startDate: null,
			endDate: null,
		});

		expect(result.startDate).toBeNull();
		expect(result.endDate).toBeNull();
	});

	test("accepts either date being cleared independently", () => {
		expect(
			saveAcademicTermDraftSchema.safeParse({
				termId: "term-1",
				startDate: null,
				endDate: new Date("2026-07-30"),
			}).success,
		).toBe(true);
		expect(
			saveAcademicTermDraftSchema.safeParse({
				termId: "term-1",
				startDate: new Date("2026-07-01"),
				endDate: null,
			}).success,
		).toBe(true);
	});

	test("rejects an end date before a present start date", () => {
		const result = saveAcademicTermDraftSchema.safeParse({
			termId: "term-1",
			startDate: new Date("2026-07-20"),
			endDate: new Date("2026-07-01"),
		});

		expect(result.success).toBe(false);
	});
});
