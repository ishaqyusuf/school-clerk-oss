import type { TRPCContext } from "@api/trpc/init";
import {
	Prisma,
	createSchoolModuleConfiguration,
	getSchoolModuleConfiguration,
	updateSchoolEnabledModules,
	updateSchoolModuleEntitlements,
	type InstitutionConfigScope,
} from "@school-clerk/db";
import { normalizeInstitutionType } from "@school-clerk/utils/institution-config";
import {
	MODULE_CATALOG,
	evaluateModuleSelection,
	resolveModuleAccess,
	type ModuleId,
	type ModuleAccessIssue,
} from "@school-clerk/utils/module-config";
import { TRPCError } from "@trpc/server";
import { requireSchoolAccountScope, requireSchoolSettingsAdmin } from "./school-settings-access";

function requireActor(ctx: TRPCContext) {
	if (!ctx.currentUser) throw new TRPCError({ code: "UNAUTHORIZED" });
	return ctx.currentUser.id;
}

async function readModuleSettings(ctx: TRPCContext, scope: InstitutionConfigScope) {
	const school = await getSchoolModuleConfiguration(ctx.db, scope);
	if (!school) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Institution is unavailable in this account." });
	}
	return {
		schoolId: school.id,
		institutionType: normalizeInstitutionType(school.institutionType),
		access: resolveModuleAccess(school.moduleConfiguration),
	};
}

function requireConfigRevision(
	settings: Awaited<ReturnType<typeof readModuleSettings>>,
	revision: number,
) {
	const config = settings.access.config;
	if (settings.access.status !== "configured" || !config) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Module configuration must be provisioned before it can be changed.",
		});
	}
	if (config.revision !== revision) throwRevisionConflict();
	return config;
}

function throwRevisionConflict(): never {
	throw new TRPCError({
		code: "CONFLICT",
		message: "Module settings changed. Reload the latest configuration and review your choices before saving.",
	});
}

function assertSelection(issues: ModuleAccessIssue[]) {
	if (issues.length === 0) return;
	const messages = issues.map((issue) => {
		const label = MODULE_CATALOG[issue.moduleId].label;
		return issue.reason === "NOT_ENTITLED"
			? `${label} has not been granted to this school.`
			: `${label} requires ${issue.dependencies.map((id) => MODULE_CATALOG[id].label).join(", ")}.`;
	});
	throw new TRPCError({ code: "BAD_REQUEST", message: messages.join(" ") });
}

function assertRequestedSchool(scope: InstitutionConfigScope, schoolId: string) {
	if (schoolId !== scope.schoolId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "The active school changed. Reload its settings before continuing.",
		});
	}
}

export function getModuleSettings(ctx: TRPCContext, schoolId: string) {
	const scope = requireSchoolAccountScope(ctx);
	assertRequestedSchool(scope, schoolId);
	return readModuleSettings(ctx, scope);
}

export async function updateEnabledModules(
	ctx: TRPCContext,
	input: { schoolId: string; revision: number; enabledModules: ModuleId[] },
) {
	const scope = requireSchoolSettingsAdmin(ctx);
	assertRequestedSchool(scope, input.schoolId);
	const actorUserId = requireActor(ctx);
	const settings = await readModuleSettings(ctx, scope);
	const config = requireConfigRevision(settings, input.revision);
	const selection = evaluateModuleSelection({
		enabledModules: input.enabledModules,
		entitledModules: config.entitledModules,
	});
	if (selection.status !== "configured") {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid module selection." });
	}
	assertSelection(selection.issues);
	const result = await updateSchoolEnabledModules(ctx.db, scope, { ...input, actorUserId });
	if (result.count !== 1) throwRevisionConflict();
	return {
		schoolId: scope.schoolId,
		access: resolveModuleAccess({
			...config,
			enabledModules: input.enabledModules,
			revision: input.revision + 1,
		}),
	};
}

// Explicit target-school operations are router-exposed only through the
// configured platformAdminProcedure, not ordinary school-admin procedures.
export function getPlatformModuleSettings(ctx: TRPCContext, schoolId: string) {
	return readModuleSettings(ctx, { schoolId, platform: true });
}

export async function initializePlatformModuleSettings(
	ctx: TRPCContext,
	input: { schoolId: string; enabledModules: ModuleId[]; entitledModules: ModuleId[] },
) {
	const actorUserId = requireActor(ctx);
	const scope: InstitutionConfigScope = { schoolId: input.schoolId, platform: true };
	const settings = await readModuleSettings(ctx, scope);
	if (settings.access.status !== "unconfigured") throwRevisionConflict();
	const selection = evaluateModuleSelection(input);
	if (selection.status !== "configured") {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid module configuration." });
	}
	assertSelection(selection.issues);
	try {
		await createSchoolModuleConfiguration(ctx.db, scope, {
			enabledModules: input.enabledModules,
			entitledModules: input.entitledModules,
			actorUserId,
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") throwRevisionConflict();
			if (error.code === "P2025") {
				throw new TRPCError({ code: "NOT_FOUND", message: "Institution is no longer available." });
			}
		}
		throw error;
	}
	return { schoolId: input.schoolId, access: selection };
}

export async function updatePlatformModuleEntitlements(
	ctx: TRPCContext,
	input: { schoolId: string; revision: number; entitledModules: ModuleId[] },
) {
	const actorUserId = requireActor(ctx);
	const scope: InstitutionConfigScope = { schoolId: input.schoolId, platform: true };
	const settings = await readModuleSettings(ctx, scope);
	const config = requireConfigRevision(settings, input.revision);
	const result = await updateSchoolModuleEntitlements(ctx.db, scope, { ...input, actorUserId });
	if (result.count !== 1) throwRevisionConflict();
	// Revocation preserves requested settings/data but removes effective access,
	// including dependents. It must not silently grant a missing dependency.
	return {
		schoolId: input.schoolId,
		access: resolveModuleAccess({
			...config,
			entitledModules: input.entitledModules,
			revision: input.revision + 1,
		}),
	};
}
