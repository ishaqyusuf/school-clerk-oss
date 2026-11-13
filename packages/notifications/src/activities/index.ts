/**
 * Activity type registry (ADR-0093): label, category, tone, icon, read policy
 * and sentence rendering for every `ActivityType`. Pure and client-safe — no
 * database or email imports — so the dashboard renders the same parts.
 */
import {
	ACTIVITY_CATEGORIES,
	ACTIVITY_TYPES,
	type ActivityAction,
	type ActivityCategory,
	type ActivityPart,
	type ActivityTypeName,
	isActivityType,
} from "@school-clerk/utils/activity";
import {
	type ResolvedModuleAccess,
	canAccessModules,
} from "@school-clerk/utils/module-config";
import {
	ACTIVITY_CATEGORY_LABELS,
	ACTIVITY_REGISTRY,
	type ActivityTypeConfig,
} from "./registry";

export { formatActivityAmount, formatLongDay, formatShortDay } from "./format";
export {
	ACTIVITY_CATEGORY_LABELS,
	ACTIVITY_REGISTRY,
	type ActivityDetail,
	type ActivityRowSnapshot,
	type ActivityTypeConfig,
} from "./registry";

export function getActivityTypeConfig(type: string): ActivityTypeConfig | null {
	return isActivityType(type) ? ACTIVITY_REGISTRY[type] : null;
}

export type ActivityCategoryGroup = {
	category: ActivityCategory;
	label: string;
	types: ActivityTypeConfig[];
};

/** Registry types grouped in category order; empty categories are omitted. */
export function listActivityTypesByCategory(
	types: readonly ActivityTypeName[] = ACTIVITY_TYPES,
): ActivityCategoryGroup[] {
	const wanted = new Set(types);
	return ACTIVITY_CATEGORIES.map((category) => ({
		category,
		label: ACTIVITY_CATEGORY_LABELS[category],
		types: ACTIVITY_TYPES.filter(
			(type) =>
				wanted.has(type) && ACTIVITY_REGISTRY[type].category === category,
		).map((type) => ACTIVITY_REGISTRY[type]),
	})).filter((group) => group.types.length > 0);
}

/**
 * Read policy for one activity type: the school must have every listed module
 * and, for role-restricted types (finance), the viewer must hold one of the
 * roles. Unknown types are denied.
 */
export function canReadActivityType(
	type: string,
	access: ResolvedModuleAccess,
	role: string | null | undefined,
) {
	const config = getActivityTypeConfig(type);
	if (!config) return false;
	if (config.roles && !config.roles.includes((role ?? "").trim().toLowerCase()))
		return false;
	return (
		config.modules.length === 0 || canAccessModules(access, config.modules)
	);
}

export function listReadableActivityTypes(
	access: ResolvedModuleAccess,
	role: string | null | undefined,
) {
	return ACTIVITY_TYPES.filter((type) =>
		canReadActivityType(type, access, role),
	);
}

export function listNotifiableActivityTypes(): ActivityTypeName[] {
	return ACTIVITY_TYPES.filter((type) => ACTIVITY_REGISTRY[type].notifiable);
}

/** Plain sentence for search, notification bodies and email. */
export function activityPartsToText(parts: readonly ActivityPart[]) {
	return parts
		.map((part) => (part.kind === "quote" ? `“${part.text}”` : part.text))
		.filter(Boolean)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

/** App-relative dashboard path for an action (proxy-relative, no /dashboard). */
export function activityActionHref(
	action: ActivityAction | null | undefined,
): string | null {
	if (!action) return null;
	switch (action.kind) {
		case "student": {
			const params = new URLSearchParams({ studentViewId: action.studentId });
			if (action.tab) params.set("studentViewTab", action.tab);
			return `/students?${params.toString()}`;
		}
		case "payment": {
			if (!action.studentId) return "/finance/transactions";
			return `/students?${new URLSearchParams({ studentViewId: action.studentId, studentViewTab: "finance" }).toString()}`;
		}
		case "attendance": {
			if (!action.classroomId) return null;
			const params = new URLSearchParams({
				viewClassroomId: action.classroomId,
				classroomTab: "attendance",
				attendanceSessionId: action.attendanceId,
				secondaryTab: "attendance-overview",
			});
			return `/academic/classes?${params.toString()}`;
		}
		case "href":
			return action.href.startsWith("/") && !action.href.startsWith("//")
				? action.href
				: null;
		default:
			return null;
	}
}
