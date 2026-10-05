import type { TRPCContext } from "@api/trpc/init";
import { getSchoolModuleConfiguration, type Database, type InstitutionConfigScope } from "@school-clerk/db";
import { assertModuleAccess, ModuleAccessDeniedError, type ModuleId } from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";

async function requireScopedModules(
	db: Database,
	scope: InstitutionConfigScope,
	requiredModules: readonly ModuleId[],
) {
	const school = await getSchoolModuleConfiguration(db, scope);
	if (!school) {
		throw new TRPCError({ code: "FORBIDDEN", message: "The selected school is unavailable in this account." });
	}
	try {
		return assertModuleAccess(school.moduleConfiguration, requiredModules);
	} catch (error) {
		if (error instanceof ModuleAccessDeniedError) {
			throw new TRPCError({ code: "FORBIDDEN", message: error.message, cause: error });
		}
		throw error;
	}
}

export function requireSchoolModules(ctx: TRPCContext, requiredModules: readonly ModuleId[]) {
	const schoolId = ctx.profile.schoolId;
	const accountId = ctx.currentUser?.saasAccountId;
	if (!ctx.currentUser || !schoolId) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "A signed-in school context is required." });
	}
	if (!accountId) {
		throw new TRPCError({ code: "FORBIDDEN", message: "School account membership is required." });
	}
	return requireScopedModules(ctx.db, { schoolId, accountId }, requiredModules);
}

// Only for services that have already verified a public token's school or a
// persisted internal job's school. Never pass a caller's raw school parameter.
export function requireVerifiedSchoolModules(
	db: Database,
	verifiedSchoolId: string,
	requiredModules: readonly ModuleId[],
) {
	return requireScopedModules(db, { schoolId: verifiedSchoolId, platform: true }, requiredModules);
}
