import { describe, expect, test } from "bun:test";
import { summarizeClassroomRecordingProgress } from "./recording-progress";

describe("summarizeClassroomRecordingProgress", () => {
	test("counts students, columns, recorded and expected scores per classroom", () => {
		const progress = summarizeClassroomRecordingProgress({
			departmentIds: ["a", "b"],
			studentCounts: [
				{ departmentId: "a", count: 10 },
				{ departmentId: "b", count: 4 },
			],
			assessments: [
				{ id: 1, departmentId: "a", subjectId: "a-math" },
				{ id: 2, departmentId: "a", subjectId: "a-english" },
				{ id: 3, departmentId: "b", subjectId: "b-math" },
			],
			recordCounts: [
				{ assessmentId: 1, count: 10 },
				{ assessmentId: 2, count: 3 },
				{ assessmentId: 3, count: 1 },
			],
		});

		expect(progress.get("a")).toEqual({
			students: 10,
			assessments: 2,
			recorded: 13,
			expected: 20,
			subjects: {
				"a-math": { recorded: 10, expected: 10 },
				"a-english": { recorded: 3, expected: 10 },
			},
		});
		expect(progress.get("b")).toEqual({
			students: 4,
			assessments: 1,
			recorded: 1,
			expected: 4,
			subjects: { "b-math": { recorded: 1, expected: 4 } },
		});
	});

	test("returns zeros for classrooms without students or assessments", () => {
		const progress = summarizeClassroomRecordingProgress({
			departmentIds: ["empty", "no-columns"],
			studentCounts: [{ departmentId: "no-columns", count: 5 }],
			assessments: [],
			recordCounts: [],
		});

		expect(progress.get("empty")).toEqual({
			students: 0,
			assessments: 0,
			recorded: 0,
			expected: 0,
			subjects: {},
		});
		expect(progress.get("no-columns")).toEqual({
			students: 5,
			assessments: 0,
			recorded: 0,
			expected: 0,
			subjects: {},
		});
	});

	test("never reports more recorded scores than expected", () => {
		const progress = summarizeClassroomRecordingProgress({
			departmentIds: ["a"],
			studentCounts: [{ departmentId: "a", count: 2 }],
			assessments: [{ id: 1, departmentId: "a", subjectId: "a-math" }],
			recordCounts: [
				{ assessmentId: 1, count: 3 },
				{ assessmentId: 99, count: 7 },
			],
		});

		expect(progress.get("a")?.recorded).toBe(2);
		expect(progress.get("a")?.subjects["a-math"]).toEqual({
			recorded: 2,
			expected: 2,
		});
	});
});
