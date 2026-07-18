import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchoolAiToolContext, SchoolAiToolHelpers } from "./context";
import { createAssessmentTools } from "./assessments";

const context = {
	conversationId: "conversation-1",
	schoolId: "school-1",
	sessionId: "session-1",
	termId: "term-1",
	userId: "user-1",
	role: "Admin",
	userName: "Admin One",
	config: {},
	runId: "run-1",
} as SchoolAiToolContext;

function createHelpers() {
	const completions: unknown[] = [];
	const helpers = {
		finishAssistantToolExecution: async (input: unknown) => {
			completions.push(input);
			return input;
		},
		getTeacherWorkspaceSummary: async () => ({}),
		guardCapability: async () => ({
			executionId: "execution-1",
			blocked: null,
		}),
		isConfirmedMutation: () => true,
		recordAssistantActivity: async () => ({}),
		requiresConfirmationResult: () => ({}),
	} as unknown as SchoolAiToolHelpers;

	return { completions, helpers };
}

function createDatabase({ failHistory = false } = {}) {
	const historyRows: Record<string, unknown>[] = [];
	let transactionOptions: Record<string, unknown> | undefined;
	const transaction = {
		classroomSubjectAssessment: {
			create: async () => {
				throw new Error("assessment create should not be called");
			},
			findFirst: async () => ({ index: 0 }),
			update: async () => {
				throw new Error("assessment update should not be called");
			},
		},
		studentAssessmentRecord: {
			findFirst: async () => ({ id: 71, obtained: 6 }),
			update: async ({ data }: { data: { obtained: number | null } }) => ({
				id: 71,
				obtained: data.obtained,
			}),
		},
		studentAssessmentRecordHistory: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				if (failHistory) throw new Error("history write failed");
				historyRows.push(data);
				return { id: "history-1" };
			},
		},
	};
	const database = {
		classRoomDepartment: {
			findMany: async () => [
				{
					id: "classroom-1",
					departmentName: "A",
					classRoom: { id: "class-1", name: "Primary 1" },
				},
			],
		},
		departmentSubject: {
			findMany: async () => [
				{
					id: "subject-1",
					subject: { id: "subject-master-1", title: "Mathematics" },
				},
			],
		},
		studentTermForm: {
			findMany: async () => [
				{
					id: "term-form-1",
					student: {
						id: "student-1",
						name: "Ada",
						otherName: null,
						surname: "One",
					},
				},
			],
		},
		classroomSubjectAssessment: {
			findMany: async () => [
				{
					id: 10,
					title: "Exam",
					obtainable: 20,
					percentageObtainable: 20,
					index: 0,
				},
			],
		},
		studentAssessmentRecord: {
			findMany: async () => [
				{
					id: 71,
					obtained: 6,
					studentTermFormId: "term-form-1",
				},
			],
		},
		$transaction: async (
			callback: (tx: typeof transaction) => unknown,
			options: Record<string, unknown>,
		) => {
			transactionOptions = options;
			return callback(transaction);
		},
	};

	return {
		database,
		historyRows,
		getTransactionOptions: () => transactionOptions,
	};
}

describe("recordAssessmentScores history", () => {
	it("records AI source and execution provenance in a serializable transaction", async () => {
		const { completions, helpers } = createHelpers();
		const { database, historyRows, getTransactionOptions } = createDatabase();
		const assessmentTool = createAssessmentTools(
			context,
			helpers,
			database as never,
		).recordAssessmentScores;
		const execute = assessmentTool.execute as unknown as (
			input: Record<string, unknown>,
			options: Record<string, unknown>,
		) => Promise<Record<string, unknown>>;

		const result = await execute(
			{
				classroomName: "Primary 1 A",
				subjectName: "Mathematics",
				assessmentTitle: "Exam",
				obtainable: 20,
				percentageObtainable: 20,
				scores: [{ studentName: "Ada One", obtained: 14 }],
				confirmationToken: "confirmed",
			},
			{},
		);

		assert.equal(result.success, true);
		assert.equal(result.scoreCount, 1);
		assert.deepEqual(getTransactionOptions(), {
			isolationLevel: "Serializable",
		});
		assert.equal(historyRows.length, 1);
		assert.deepEqual(
			{
				schoolProfileId: historyRows[0]?.schoolProfileId,
				previousObtained: historyRows[0]?.previousObtained,
				newObtained: historyRows[0]?.newObtained,
				source: historyRows[0]?.source,
				actorUserId: historyRows[0]?.actorUserId,
				actorName: historyRows[0]?.actorName,
				sourceReference: historyRows[0]?.sourceReference,
			},
			{
				schoolProfileId: "school-1",
				previousObtained: 6,
				newObtained: 14,
				source: "AI_TOOL",
				actorUserId: "user-1",
				actorName: "Admin One",
				sourceReference: "execution-1",
			},
		);
		assert.equal(
			completions.some(
				(completion) =>
					(completion as Record<string, unknown>).toolExecutionId ===
						"execution-1" &&
					(completion as Record<string, unknown>).status === "completed",
			),
			true,
		);
	});

	it("fails the AI score transaction when history cannot be created", async () => {
		const { completions, helpers } = createHelpers();
		const { database } = createDatabase({ failHistory: true });
		const assessmentTool = createAssessmentTools(
			context,
			helpers,
			database as never,
		).recordAssessmentScores;
		const execute = assessmentTool.execute as unknown as (
			input: Record<string, unknown>,
			options: Record<string, unknown>,
		) => Promise<Record<string, unknown>>;

		await assert.rejects(
			execute(
				{
					classroomName: "Primary 1 A",
					subjectName: "Mathematics",
					assessmentTitle: "Exam",
					obtainable: 20,
					percentageObtainable: 20,
					scores: [{ studentName: "Ada One", obtained: 14 }],
					confirmationToken: "confirmed",
				},
				{},
			),
			/history write failed/,
		);
		assert.equal(
			completions.some(
				(completion) =>
					(completion as Record<string, unknown>).toolExecutionId ===
						"execution-1" &&
					(completion as Record<string, unknown>).status === "failed",
			),
			true,
		);
	});
});
