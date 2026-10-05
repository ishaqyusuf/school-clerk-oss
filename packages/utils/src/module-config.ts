import { z } from "zod";
import { MODULE_CATALOG, MODULE_IDS, moduleIdSchema, type ModuleId } from "./module-catalog";

export { MODULE_CATALOG, MODULE_IDS, moduleIdSchema, type ModuleId } from "./module-catalog";

export const moduleListSchema = z.array(moduleIdSchema)
	.max(MODULE_IDS.length)
	.refine((modules) => new Set(modules).size === modules.length, {
		message: "Each module may appear only once.",
	});

export const moduleConfigSchema = z.object({
	version: z.literal(1),
	revision: z.number().int().nonnegative().max(2_147_483_647),
	enabledModules: moduleListSchema,
	entitledModules: moduleListSchema,
}).strict();

export const updateEnabledModulesSchema = z.object({
	revision: z.number().int().nonnegative().max(2_147_483_646),
	enabledModules: moduleListSchema,
}).strict();

export const updateModuleEntitlementsSchema = z.object({
	revision: z.number().int().nonnegative().max(2_147_483_646),
	entitledModules: moduleListSchema,
}).strict();

export type ModuleConfig = z.infer<typeof moduleConfigSchema>;

export const initializeModuleConfigSchema = z.object({
	enabledModules: moduleListSchema,
	entitledModules: moduleListSchema,
}).strict();

export type ModuleAccessIssue = {
	moduleId: ModuleId;
	reason: "NOT_ENTITLED" | "MISSING_DEPENDENCY";
	dependencies: ModuleId[];
};

export type ResolvedModuleAccess = {
	status: "configured" | "unconfigured" | "invalid";
	config: ModuleConfig | null;
	effectiveModules: ModuleId[];
	issues: ModuleAccessIssue[];
};

export function getModuleDependencies(moduleId: ModuleId): ModuleId[] {
	const dependencies = new Set<ModuleId>();
	const visit = (id: ModuleId) => {
		for (const dependency of MODULE_CATALOG[id].dependencies) {
			if (dependency === moduleId || dependencies.has(dependency)) continue;
			dependencies.add(dependency);
			visit(dependency);
		}
	};
	visit(moduleId);
	return MODULE_IDS.filter((id) => dependencies.has(id));
}

// Invalid persisted data never grants access. A missing record is a separate
// state so callers must deliberately adopt a legacy/default policy, not turn
// an explicitly empty configuration back into an enabled one.
export function resolveModuleAccess(input: unknown): ResolvedModuleAccess {
	if (input === null || input === undefined) {
		return { status: "unconfigured", config: null, effectiveModules: [], issues: [] };
	}
	const parsed = moduleConfigSchema.safeParse(input);
	if (!parsed.success) {
		return { status: "invalid", config: null, effectiveModules: [], issues: [] };
	}
	const config = parsed.data;
	const entitled = new Set(config.entitledModules);
	const requested = new Set(config.enabledModules);
	const candidates = new Set(config.enabledModules.filter((id) => entitled.has(id)));
	const issues: ModuleAccessIssue[] = [];
	const effectiveModules: ModuleId[] = [];
	for (const moduleId of MODULE_IDS) {
		if (!requested.has(moduleId)) continue;
		if (!entitled.has(moduleId)) {
			issues.push({ moduleId, reason: "NOT_ENTITLED", dependencies: [] });
			continue;
		}
		const dependencies = getModuleDependencies(moduleId)
			.filter((dependency) => !candidates.has(dependency));
		if (dependencies.length > 0) {
			issues.push({ moduleId, reason: "MISSING_DEPENDENCY", dependencies });
			continue;
		}
		effectiveModules.push(moduleId);
	}
	return { status: "configured", config, effectiveModules, issues };
}

export function evaluateModuleSelection(input: {
	enabledModules: readonly ModuleId[];
	entitledModules: readonly ModuleId[];
}) {
	return resolveModuleAccess({
		version: 1,
		revision: 0,
		enabledModules: [...input.enabledModules],
		entitledModules: [...input.entitledModules],
	});
}

export function canAccessModules(
	access: ResolvedModuleAccess,
	requiredModules: readonly ModuleId[],
) {
	if (access.status !== "configured") return false;
	const effective = new Set(access.effectiveModules);
	return requiredModules.every((moduleId) => effective.has(moduleId));
}

export class ModuleAccessDeniedError extends Error {
	constructor(
		public readonly reason: "UNCONFIGURED" | "INVALID_CONFIGURATION" | "DISABLED",
		message: string,
		public readonly modules: readonly ModuleId[] = [],
	) {
		super(message);
		this.name = "ModuleAccessDeniedError";
	}
}

/** Call only after establishing ownership or a trusted token/job school scope. */
export function assertModuleAccess(input: unknown, requiredModules: readonly ModuleId[]) {
	const access = resolveModuleAccess(input);
	if (access.status === "unconfigured") {
		throw new ModuleAccessDeniedError("UNCONFIGURED", "School modules must be provisioned before this operation is available.");
	}
	if (access.status === "invalid") {
		throw new ModuleAccessDeniedError("INVALID_CONFIGURATION", "School module configuration requires administrator attention.");
	}
	const missing = requiredModules.filter((moduleId) => !access.effectiveModules.includes(moduleId));
	if (missing.length > 0) {
		throw new ModuleAccessDeniedError(
			"DISABLED",
			`This operation requires enabled modules: ${missing.map((id) => MODULE_CATALOG[id].label).join(", ")}.`,
			missing,
		);
	}
	return access;
}
