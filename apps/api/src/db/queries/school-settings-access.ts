import type { TRPCContext } from "@api/trpc/init";
import type { InstitutionConfigScope } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";

export function requireSchoolAccountScope(ctx: TRPCContext): InstitutionConfigScope {
	const schoolId = ctx.profile.schoolId;
	const accountId = ctx.currentUser?.saasAccountId;
	if (!ctx.currentUser || !schoolId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "A signed-in school context is required.",
		});
	}
	if (!accountId) {
		throw new TRPCError({ code: "FORBIDDEN", message: "School account membership is required." });
	}
	return { schoolId, accountId };
}

export function requireSchoolSettingsAdmin(ctx: TRPCContext): InstitutionConfigScope {
	const scope = requireSchoolAccountScope(ctx);
	if (ctx.currentUser?.role !== "Admin" && ctx.currentUser?.role !== "ADMIN") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only school administrators can change school settings.",
		});
	}
	return scope;
}
