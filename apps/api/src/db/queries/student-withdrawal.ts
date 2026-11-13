import type { TRPCContext } from "@api/trpc/init";
import {
	getStudentWithdrawalHistory,
	readmitStudent,
	StudentWithdrawalError,
	withdrawStudent,
} from "@school-clerk/db";
import type {
	ReadmitStudentInput,
	StudentWithdrawalHistoryInput,
	WithdrawStudentInput,
} from "@school-clerk/utils/student-withdrawal";
import { TRPCError } from "@trpc/server";

function requireActor(ctx: TRPCContext) {
	const schoolId = ctx.profile.schoolId;
	const userId = ctx.currentUser?.id;
	const bearer = ctx.profile.authSessionId;
	if (!schoolId || !userId || !bearer) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school workspace is required." });
	}
	return { schoolId, userId, bearer };
}

function toTRPCError(error: unknown, fallback: string): never {
	if (error instanceof TRPCError) throw error;
	if (error instanceof StudentWithdrawalError) {
		throw new TRPCError({ code: error.code, message: error.message, cause: error });
	}
	if ((error as { code?: string } | null)?.code === "P2034") {
		throw new TRPCError({
			code: "CONFLICT",
			message: "The student record changed while saving. Refresh and try again.",
			cause: error,
		});
	}
	throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallback, cause: error });
}

export async function withdrawStudentFromSchool(ctx: TRPCContext, input: WithdrawStudentInput) {
	const actor = requireActor(ctx);
	try {
		return await withdrawStudent(ctx.db, actor, input);
	} catch (error) {
		toTRPCError(error, "The withdrawal could not be recorded. Refresh the student record before trying again.");
	}
}

export async function readmitWithdrawnStudent(ctx: TRPCContext, input: ReadmitStudentInput) {
	const actor = requireActor(ctx);
	try {
		return await readmitStudent(ctx.db, actor, input);
	} catch (error) {
		toTRPCError(error, "The readmission could not be recorded. Refresh the student record before trying again.");
	}
}

export async function readStudentWithdrawalHistory(ctx: TRPCContext, input: StudentWithdrawalHistoryInput) {
	const actor = requireActor(ctx);
	try {
		return await getStudentWithdrawalHistory(ctx.db, actor, { studentId: input.studentId as string });
	} catch (error) {
		toTRPCError(error, "Withdrawal history could not be loaded.");
	}
}
