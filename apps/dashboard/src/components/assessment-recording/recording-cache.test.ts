import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
	applySavedScoreToReport,
	markRecordingCachesStaleAfterMutation,
	markRecordingProgressDirty,
	progressDepartmentIds,
	refreshDirtyRecordingProgress,
} from "./recording-cache";

const progressKey = (termId: string, departmentIds: string[]) => [
	["assessments", "getRecordingProgress"],
	{ input: { termId, departmentIds }, type: "query" },
];
const optionsKey = [
	["assessments", "getRecordingContextOptions"],
	{ input: { termId: "t1" }, type: "query" },
];

function snapshot(recorded: number) {
	return { students: 2, assessments: 1, recorded, expected: 2, subjects: {} };
}

describe("refreshDirtyRecordingProgress", () => {
	test("re-counts only dirty classrooms and merges them into the cache", async () => {
		const qc = new QueryClient();
		qc.setQueryData(progressKey("t1", ["a", "b"]), {
			termId: "t1",
			classrooms: { a: snapshot(0), b: snapshot(0) },
		});
		const calls: Array<{ termId: string; departmentIds: string[] }> = [];

		markRecordingProgressDirty("b");
		await refreshDirtyRecordingProgress(qc, async (input) => {
			calls.push(input);
			return { termId: input.termId, classrooms: { b: snapshot(2) } };
		});

		expect(calls).toEqual([{ termId: "t1", departmentIds: ["b"] }]);
		expect(qc.getQueryData<unknown>(progressKey("t1", ["a", "b"]))).toEqual({
			termId: "t1",
			classrooms: { a: snapshot(0), b: snapshot(2) },
		});

		// Nothing dirty any more: no request.
		await refreshDirtyRecordingProgress(qc, async (input) => {
			calls.push(input);
			return { termId: input.termId, classrooms: {} };
		});
		expect(calls).toHaveLength(1);
	});

	test("keeps classrooms dirty when the re-count fails", async () => {
		const qc = new QueryClient();
		qc.setQueryData(progressKey("t1", ["a"]), {
			termId: "t1",
			classrooms: { a: snapshot(0) },
		});
		markRecordingProgressDirty("a");
		await refreshDirtyRecordingProgress(qc, async () => {
			throw new Error("offline");
		});

		let retried = false;
		await refreshDirtyRecordingProgress(qc, async (input) => {
			retried = true;
			return { termId: input.termId, classrooms: { a: snapshot(1) } };
		});
		expect(retried).toBe(true);
	});
});

describe("markRecordingCachesStaleAfterMutation", () => {
	test("marks the long-lived caches stale after structure writes only", () => {
		const qc = new QueryClient();
		qc.setQueryData(optionsKey, { terms: [] });

		markRecordingCachesStaleAfterMutation(qc, [["finance", "receivePayment"]]);
		expect(qc.getQueryState(optionsKey)?.isInvalidated).toBe(false);

		markRecordingCachesStaleAfterMutation(qc, [["subjects", "create"]]);
		expect(qc.getQueryState(optionsKey)?.isInvalidated).toBe(true);
	});
});

test("progressDepartmentIds sorts and de-duplicates", () => {
	expect(progressDepartmentIds(["b", null, "a", "b"])).toEqual(["a", "b"]);
});

describe("applySavedScoreToReport", () => {
	const report = {
		departmentName: "JSS 1",
		subjects: [
			{
				id: "math",
				assessments: [
					{
						id: 1,
						assessmentResults: [
							{ id: 10, obtained: 4, studentTermFormId: "s1", studentId: "u1" },
						],
					},
				],
			},
			{ id: "english", assessments: [{ id: 2, assessmentResults: [] }] },
		],
	};

	test("updates an existing score and leaves other subjects untouched", () => {
		const next = applySavedScoreToReport(report, {
			assessmentId: 1,
			studentTermFormId: "s1",
			studentId: "u1",
			id: 10,
			obtained: 9,
		});
		expect(next?.subjects?.[0]?.assessments?.[0]?.assessmentResults).toEqual([
			{ id: 10, obtained: 9, studentTermFormId: "s1", studentId: "u1" },
		]);
		expect(next?.subjects?.[1]).toBe(report.subjects[1]);
	});

	test("adds a first score for a student", () => {
		const next = applySavedScoreToReport(report, {
			assessmentId: 2,
			studentTermFormId: "s1",
			studentId: "u1",
			id: 11,
			obtained: 3,
		});
		expect(
			next?.subjects?.[1]?.assessments?.[0]?.assessmentResults as unknown,
		).toEqual([
			{
				percentageScore: null,
				id: 11,
				obtained: 3,
				studentTermFormId: "s1",
				studentId: "u1",
			},
		]);
	});

	test("returns the same report when the column is elsewhere", () => {
		expect(
			applySavedScoreToReport(report, {
				assessmentId: 99,
				studentTermFormId: "s1",
				studentId: "u1",
				id: 1,
				obtained: 1,
			}),
		).toBe(report);
	});
});
