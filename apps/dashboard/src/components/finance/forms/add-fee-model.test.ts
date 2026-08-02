import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFeeItemPayloads,
	closedAddFeeParams,
	getAddFeeDefaultValues,
	getFeeAssignmentSummary,
	getFeeScopeError,
	resolveFeeClassroomIds,
	summarizeFeeBatch,
} from "./add-fee-model";

describe("add fee model", () => {
	it("keeps enrollment audience separate from optional assignment", () => {
		assert.deepEqual(
			buildFeeItemPayloads({
				streamId: null,
				streamName: "Transport Fee",
				required: false,
				studentAudience: "NEW_ADMISSIONS_ONLY",
				classRoomDepartmentIds: ["class-1"],
				lines: [{ description: "Bus service", amount: 25_000 }],
			}),
			[
				{
					streamId: null,
					streamName: "Transport Fee",
					name: "Bus service",
					description: "Bus service",
					amount: 25_000,
					collectable: false,
					studentAudience: "NEW_ADMISSIONS_ONLY",
					classRoomDepartmentIds: ["class-1"],
				},
			],
		);
	});

	it("explains required and optional behavior in enrollment language", () => {
		assert.equal(
			getFeeAssignmentSummary({
				audience: "NEW_ADMISSIONS_ONLY",
				required: true,
			}),
			"New admissions only: assigned automatically when the student enrolls.",
		);
		assert.equal(
			getFeeAssignmentSummary({
				audience: "NEW_ADMISSIONS_ONLY",
				required: false,
			}),
			"New admissions only: available in the student form and assigned only when selected.",
		);
	});

	it("builds and clears selected-student handoff state consistently", () => {
		assert.deepEqual(
			getAddFeeDefaultValues({
				classroomId: "class-1",
				studentId: "student-1",
				title: "Transport Fee",
			}),
			{
				scope: "student",
				classroomIds: ["class-1"],
				streamId: null,
				streamName: "Transport Fee",
				required: true,
				studentAudience: "ALL_STUDENTS",
				lines: [{ description: "Transport Fee", amount: 0 }],
			},
		);
		assert.deepEqual(closedAddFeeParams, {
			addFee: null,
			addFeeClassroomId: null,
			addFeeStudentId: null,
			addFeeStudentTermFormId: null,
			addFeeTitle: null,
		});
	});

	it("requires a classroom for classroom-scoped fees", () => {
		assert.equal(
			getFeeScopeError({ scope: "classroom", classroomIds: [] }),
			"Select at least one classroom",
		);
		assert.equal(getFeeScopeError({ scope: "global", classroomIds: [] }), null);
	});

	it("rejects classroom IDs that are no longer available", () => {
		assert.deepEqual(
			resolveFeeClassroomIds({
				scope: "classroom",
				selectedIds: ["class-1", "stale-class"],
				availableIds: ["class-1"],
			}),
			{
				ids: [],
				error:
					"Refresh the classroom list and select the fee classrooms again.",
			},
		);
	});

	it("keeps only failed lines available after a partial batch", () => {
		const lines = ["Tuition", "Transport", "Books"];
		const result = summarizeFeeBatch(lines, [
			{ status: "fulfilled", value: {} },
			{ status: "rejected", reason: new Error("Transport failed") },
			{ status: "fulfilled", value: {} },
		]);

		assert.deepEqual(result, {
			failedLines: ["Transport"],
			succeededCount: 2,
			firstErrorMessage: "Transport failed",
		});
	});
});
