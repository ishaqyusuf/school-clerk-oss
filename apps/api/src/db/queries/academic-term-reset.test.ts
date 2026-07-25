import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import {
	previewAcademicTermReset,
	resetAcademicTerm,
} from "./academic-term-reset";

function createContext({
	lifecycleStatus = "READY",
	financeRecords = 0,
}: {
	lifecycleStatus?: "DRAFT" | "READY" | "ACTIVE" | "CLOSED";
	financeRecords?: number;
} = {}) {
	const calls: string[] = [];
	const termUpdates: Array<Record<string, unknown>> = [];
	const count = async () => 0;
	const updateMany = async () => ({ count: 0 });
	const deleteMany = async () => ({ count: 0 });
	const tx = {
		attendanceSessionGuard: { deleteMany },
		studentAttendance: { updateMany },
		classRoomAttendance: {
			count,
			findMany: async () => [],
			updateMany,
		},
		studentAssessmentRecord: { updateMany },
		assessmentPublicLink: { count, updateMany },
		assessmentWorkbookImport: { count, deleteMany },
		assessmentWorkbookExport: { count, deleteMany },
		classroomSubjectAssessment: { updateMany },
		staffSubject: { updateMany },
		staffAcademicAccessGrant: { updateMany },
		staffClassroomDepartmentTermProfiles: { updateMany },
		staffTermProfile: { count, findMany: async () => [], updateMany },
		studentTermForm: { count, findMany: async () => [], updateMany },
		departmentSubject: { count, findMany: async () => [], updateMany },
		academicTermSetupRun: { deleteMany },
		sessionTerm: {
			findFirst: async () => ({
				id: "term-1",
				title: "Second Term",
				lifecycleStatus,
				session: { title: "2025/2026" },
			}),
			update: async ({ data }: { data: Record<string, unknown> }) => {
				calls.push("term-reset");
				termUpdates.push(data);
				return {};
			},
		},
		activity: {
			create: async ({
				data,
			}: {
				data: { meta: { action: string } };
			}) => {
				calls.push(data.meta.action);
				return {};
			},
		},
	};
	const db = {
		schoolProfile: {
			findFirst: async () => ({ id: "school-1" }),
		},
		sessionTerm: {
			findFirst: async () => ({
				id: "term-1",
				title: "Second Term",
				lifecycleStatus,
				session: { title: "2025/2026" },
			}),
		},
		departmentSubject: { count },
		studentTermForm: { count },
		staffTermProfile: { count },
		classRoomAttendance: { count },
		assessmentPublicLink: { count },
		assessmentWorkbookExport: { count },
		assessmentWorkbookImport: { count },
		financeItem: { count: async () => financeRecords },
		financeCharge: { count },
		financePayment: { count },
		financeLedgerEntry: { count },
		financeTermLedgerClose: { count },
		financePayrollStructure: { count },
		financePurchase: { count },
		$transaction: async (callback: (transaction: typeof tx) => unknown) =>
			callback({ ...db, ...tx } as typeof tx),
	};
	return {
		calls,
		termUpdates,
		ctx: {
			db,
			currentUser: { id: "admin-1", name: "Admin", role: "Admin" },
			profile: { schoolId: "school-1" },
		} as unknown as TRPCContext,
	};
}

describe("academic term reset", () => {
	test("previews a reset and returns the exact confirmation phrase", async () => {
		const { ctx } = createContext();
		const preview = await previewAcademicTermReset(ctx, { termId: "term-1" });

		expect(preview.canReset).toBe(true);
		expect(preview.confirmationText).toBe("I APPROVE RESET");
	});

	test("protects active terms", async () => {
		const { ctx } = createContext({ lifecycleStatus: "ACTIVE" });

		await expect(
			previewAcademicTermReset(ctx, { termId: "term-1" }),
		).rejects.toBeInstanceOf(TRPCError);
	});

	test("blocks reset when finance records exist", async () => {
		const { ctx } = createContext({ financeRecords: 1 });
		const preview = await previewAcademicTermReset(ctx, { termId: "term-1" });

		expect(preview.canReset).toBe(false);
		expect(preview.blockers[0]?.code).toBe("FINANCE_DATA_EXISTS");
	});

	test("requires typed confirmation and records the reset audit", async () => {
		const { ctx, calls, termUpdates } = createContext();

		await expect(
			resetAcademicTerm(ctx, {
				termId: "term-1",
				confirmation: "RESET",
			}),
		).rejects.toBeInstanceOf(TRPCError);

		const result = await resetAcademicTerm(ctx, {
			termId: "term-1",
			confirmation: "I APPROVE RESET",
		});
		expect(result.success).toBe(true);
		expect(calls).toContain("term-reset");
		expect(calls).toContain("academic_term_reset");
		expect(termUpdates[0]).toMatchObject({
			startDate: null,
			endDate: null,
			lifecycleStatus: "DRAFT",
		});
	});
});
