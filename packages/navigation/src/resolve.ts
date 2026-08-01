import type {
	InstitutionType,
	NavAvailability,
	NavItemDefinition,
	NavModuleDefinition,
	NavStatus,
	NavigationModulePresentation,
	NavigationWorkspaceProfile,
	ResolvedNavItem,
	ResolvedNavModule,
	ResolvedNavigation,
	Role,
} from "./types";

const ROLES: Role[] = [
	"Admin",
	"Teacher",
	"Student",
	"Parent",
	"Accountant",
	"Registrar",
	"HR",
	"Staff",
	"Support",
];

export type ResolveNavigationOptions = {
	enabledModules?: Iterable<string>;
	includeStatuses?: NavStatus[];
	institutionType?: InstitutionType | null;
	modules: NavModuleDefinition[];
	permissions?: Record<string, boolean>;
	profiles: NavigationWorkspaceProfile[];
	role?: string | null;
};

export function normalizeNavigationRole(role?: string | null): Role | null {
	const normalized = role?.trim().toLowerCase();
	if (!normalized) return null;
	return (
		ROLES.find((candidate) => candidate.toLowerCase() === normalized) ?? null
	);
}

function policyAllows(
	policy: NavAvailability,
	context: {
		enabledModules: Set<string> | null;
		includeStatuses: Set<NavStatus>;
		institutionType?: InstitutionType | null;
		permissions: Record<string, boolean>;
		role: Role | null;
	},
) {
	const status = policy.status ?? "live";
	if (!context.includeStatuses.has(status)) return false;

	if (policy.roles?.length) {
		if (!context.role || !policy.roles.includes(context.role)) return false;
	}

	if (policy.permissions?.length) {
		const allowed = policy.permissions.every(
			(permission) => context.permissions[permission.toLowerCase()],
		);
		if (!allowed) return false;
	}

	if (policy.institutionTypes?.length) {
		if (
			!context.institutionType ||
			!policy.institutionTypes.includes(context.institutionType)
		) {
			return false;
		}
	}

	if (policy.requiresModules?.length) {
		if (
			!context.enabledModules ||
			!policy.requiresModules.every((module) =>
				context.enabledModules?.has(module.toLowerCase()),
			)
		) {
			return false;
		}
	}

	return true;
}

function resolveItem(
	item: NavItemDefinition,
	policies: NavAvailability[],
	context: Parameters<typeof policyAllows>[1],
): ResolvedNavItem | null {
	const itemPolicies = [...policies, item];
	if (!itemPolicies.every((policy) => policyAllows(policy, context))) {
		return null;
	}

	const children = (item.children ?? [])
		.map((child) => resolveItem(child, itemPolicies, context))
		.filter((child): child is ResolvedNavItem => child !== null);

	if (!item.href && children.length === 0) return null;

	return {
		childPaths: item.childPaths ?? [],
		children,
		href: item.href,
		icon: item.icon,
		key: item.key,
		status: item.status ?? "live",
		title: item.title,
	};
}

function firstHref(module: ResolvedNavModule) {
	for (const section of module.sections) {
		for (const item of section.items) {
			if (item.href) return item.href;
			const childHref = item.children.find((child) => child.href)?.href;
			if (childHref) return childHref;
		}
	}
	return null;
}

function applyModulePresentation(
	sections: ResolvedNavModule["sections"],
	presentation?: NavigationModulePresentation,
) {
	if (!presentation?.sections) return sections;

	const itemsByKey = new Map(
		sections.flatMap((section) =>
			section.items.map((item) => [item.key, item] as const),
		),
	);

	return presentation.sections
		.map((section) => ({
			items: section.items
				.map((itemPresentation) => {
					const item = itemsByKey.get(itemPresentation.key);
					return item
						? {
								...item,
								title: itemPresentation.title ?? item.title,
							}
						: null;
				})
				.filter((item): item is ResolvedNavItem => item !== null),
			key: section.key,
			title: section.title,
		}))
		.filter((section) => section.items.length > 0);
}

export function resolveNavigation({
	enabledModules,
	includeStatuses = ["live"],
	institutionType,
	modules,
	permissions = {},
	profiles,
	role: rawRole,
}: ResolveNavigationOptions): ResolvedNavigation {
	const role = normalizeNavigationRole(rawRole);
	const profile = profiles.find((candidate) =>
		candidate.roles.some((candidateRole) => candidateRole === role),
	);

	if (!profile) {
		return {
			defaultHref: "/unavailable",
			modules: [],
			profile: null,
			role,
			surface: "unavailable",
			totalLinks: 0,
		};
	}

	const normalizedPermissions = Object.fromEntries(
		Object.entries(permissions).map(([key, value]) => [
			key.toLowerCase(),
			value,
		]),
	);
	const context = {
		enabledModules: enabledModules
			? new Set(Array.from(enabledModules, (module) => module.toLowerCase()))
			: null,
		includeStatuses: new Set(includeStatuses),
		institutionType,
		permissions: normalizedPermissions,
		role,
	};
	const moduleOrder = new Map(
		profile.moduleOrder.map((moduleKey, index) => [moduleKey, index]),
	);
	const modulePresentation = new Map(
		(profile.presentation ?? []).map((presentation) => [
			presentation.key,
			presentation,
		]),
	);

	const resolvedModules = modules
		.filter((module) => moduleOrder.has(module.key))
		.filter((module) => policyAllows(module, context))
		.map<ResolvedNavModule | null>((module) => {
			const presentation = modulePresentation.get(module.key);
			const resolvedSections = module.sections
				.filter((section) => policyAllows(section, context))
				.map((section) => ({
					items: section.items
						.map((item) => resolveItem(item, [module, section], context))
						.filter((item): item is ResolvedNavItem => item !== null),
					key: section.key,
					title: section.title,
				}))
				.filter((section) => section.items.length > 0);

			const sections = applyModulePresentation(resolvedSections, presentation);

			if (sections.length === 0) return null;

			const resolvedModule: ResolvedNavModule = {
				defaultHref: null,
				icon: module.icon,
				key: module.key,
				sections,
				subtitle: presentation?.subtitle ?? module.subtitle,
				title: presentation?.title ?? module.title,
				workspace: module.workspace,
			};
			resolvedModule.defaultHref = firstHref(resolvedModule);
			return resolvedModule;
		})
		.filter((module): module is ResolvedNavModule => module !== null)
		.sort(
			(left, right) =>
				(moduleOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
				(moduleOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER),
		);

	const visibleHrefs = new Set(
		resolvedModules.flatMap((module) =>
			module.sections.flatMap((section) =>
				section.items.flatMap((item) => [
					item.href,
					...item.children.map((child) => child.href),
				]),
			),
		),
	);
	const surface =
		(profile.surface === "sidebar" || profile.surface === "compact") &&
		resolvedModules.length === 0
			? "unavailable"
			: profile.surface;
	const defaultHref =
		profile.surface === "header-only" || profile.surface === "unavailable"
			? profile.defaultHref
			: visibleHrefs.has(profile.defaultHref)
				? profile.defaultHref
				: (resolvedModules[0]?.defaultHref ?? "/unavailable");
	const totalLinks = resolvedModules.reduce(
		(total, module) =>
			total +
			module.sections.reduce(
				(sectionTotal, section) =>
					sectionTotal +
					section.items.reduce(
						(itemTotal, item) => itemTotal + 1 + item.children.length,
						0,
					),
				0,
			),
		0,
	);

	return {
		defaultHref,
		modules:
			surface === "header-only" || surface === "unavailable"
				? []
				: resolvedModules,
		profile,
		role,
		surface,
		totalLinks,
	};
}
