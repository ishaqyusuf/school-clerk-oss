import type { TRPCContext } from "@api/trpc/init";
import {
	getSchoolInstitutionConfig,
	updateSchoolInstitutionConfig,
	type InstitutionConfigScope,
} from "@school-clerk/db";
import {
	institutionTypeSchema,
	normalizeInstitutionType,
	type InstitutionType,
} from "@school-clerk/utils/institution-config";
import { TRPCError } from "@trpc/server";
import { requireSchoolAccountScope, requireSchoolSettingsAdmin } from "./school-settings-access";

async function readInstitution(ctx: TRPCContext, scope: InstitutionConfigScope) {
	const school = await getSchoolInstitutionConfig(ctx.db, scope);
	if (!school) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Institution is unavailable in this account." });
	}
	return {
		schoolId: school.id,
		schoolName: school.name,
		institutionType: normalizeInstitutionType(school.institutionType),
		storedInstitutionType: school.institutionType,
	};
}

async function writeInstitution(
	ctx: TRPCContext,
	scope: InstitutionConfigScope,
	institutionType: InstitutionType,
) {
	const validatedType = institutionTypeSchema.parse(institutionType);
	const result = await updateSchoolInstitutionConfig(ctx.db, scope, validatedType);
	if (result.count !== 1) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Institution is unavailable in this account." });
	}
	return { schoolId: scope.schoolId, institutionType: validatedType };
}

export function getInstitutionSettings(ctx: TRPCContext) {
	return readInstitution(ctx, requireSchoolAccountScope(ctx));
}

export function updateInstitutionSettings(ctx: TRPCContext, institutionType: InstitutionType) {
	const scope = requireSchoolSettingsAdmin(ctx);
	return writeInstitution(ctx, scope, institutionType);
}

// These explicit cross-account operations are exposed only through the router's
// configured platformAdminProcedure, never authenticatedProcedure.
export function getPlatformInstitutionSettings(ctx: TRPCContext, schoolId: string) {
	return readInstitution(ctx, { schoolId, platform: true });
}

export function updatePlatformInstitutionSettings(
	ctx: TRPCContext,
	schoolId: string,
	institutionType: InstitutionType,
) {
	return writeInstitution(ctx, { schoolId, platform: true }, institutionType);
}
