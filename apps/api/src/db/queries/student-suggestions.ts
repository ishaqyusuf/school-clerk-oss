import type { StudentSuggestionsInput } from "@api/schemas/student-suggestions";
import type { TRPCContext } from "@api/trpc/init";
import { findAuthSessionByBearer } from "@api/trpc/init";
import { getStudentSuggestions } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";

export async function readStudentSuggestions(
	ctx: TRPCContext,
	input: StudentSuggestionsInput,
) {
	const { schoolId, sessionId, termId, studentNameFormat } = ctx.profile;
	if (!schoolId || !sessionId || !termId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message:
				"Select a school, academic session, and term before checking the register.",
		});
	}
	if (input.viewScope) {
		const scope = input.viewScope;
		if (
			scope.schoolId !== schoolId ||
			scope.sessionId !== sessionId ||
			scope.termId !== termId ||
			scope.userId !== ctx.currentUser?.id
		) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Your registration workspace changed. Refresh the form.",
			});
		}
		const session = ctx.profile.authSessionId
			? await findAuthSessionByBearer(ctx.db, ctx.profile.authSessionId)
			: null;
		if (!session || session.id !== scope.loginSessionId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Your registration session changed. Refresh the form.",
			});
		}
	}
	const term = await ctx.db.sessionTerm.findFirst({
		where: {
			id: termId,
			schoolId,
			sessionId,
			deletedAt: null,
			session: { schoolId, deletedAt: null },
		},
		select: { id: true },
	});
	if (!term)
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The selected academic term is unavailable. Refresh the form.",
		});
	return getStudentSuggestions(ctx.db, {
		name: input.name ?? "",
		surname: input.surname ?? "",
		otherName: input.otherName ?? "",
		cursor: input.cursor,
		pageSize: input.pageSize ?? 5,
		schoolId,
		sessionId,
		termId,
		nameFormat: studentNameFormat,
	});
}
