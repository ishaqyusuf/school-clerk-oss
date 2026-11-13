import { getActivityTypeConfig } from "@school-clerk/notifications/activities";
import {
	ACTIVITY_CATEGORIES,
	type ActivityCategory,
	type ActivityNotificationAction,
	type ActivityPart,
	isActivityType,
} from "@school-clerk/utils/activity";

/*
 * Stored activity notifications (ADR-0093) carry an `ActivityNotificationAction`
 * snapshot in `Notification.action`. Rows are JSON written by older and newer
 * API builds, so every field is checked before the bell renders it richly.
 * Anything that does not parse falls back to the plain title/body row.
 */

export type ParsedActivityNotification = ActivityNotificationAction & {
	parts: ActivityPart[];
	/** Registry label, e.g. "Payment reversed". */
	label: string;
	actor: { userId: string | null; name: string };
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function oneOf<T extends string>(
	value: unknown,
	options: readonly T[],
): T | undefined {
	return typeof value === "string" &&
		(options as readonly string[]).includes(value)
		? (value as T)
		: undefined;
}

function parsePart(value: unknown): ActivityPart | null {
	if (!isRecord(value)) return null;
	const text = str(value.text);
	if (text === null) return null;
	switch (value.kind) {
		case "text":
		case "quote":
			return { kind: value.kind, text };
		case "actor":
			return { kind: "actor", text, userId: str(value.userId) };
		case "student": {
			const id = str(value.id);
			return id ? { kind: "student", text, id } : { kind: "text", text };
		}
		case "classroom":
		case "term":
			return { kind: value.kind, text, id: str(value.id) ?? undefined };
		case "amount":
			return {
				kind: "amount",
				text,
				value: typeof value.value === "number" ? value.value : 0,
				tone:
					oneOf(value.tone, ["positive", "negative", "neutral"] as const) ??
					"neutral",
			};
		case "count":
			return {
				kind: "count",
				text,
				tone: oneOf(value.tone, [
					"positive",
					"negative",
					"warning",
					"neutral",
				] as const),
			};
		case "date":
			return { kind: "date", text, iso: str(value.iso) ?? undefined };
		default:
			// Unknown future kinds still read as plain words.
			return { kind: "text", text };
	}
}

/**
 * Returns the activity snapshot when `action` is a well-formed activity
 * notification action with a renderable sentence; otherwise `null`.
 */
export function parseActivityNotificationAction(
	action: unknown,
): ParsedActivityNotification | null {
	if (!isRecord(action) || action.kind !== "activity") return null;
	const activityId = str(action.activityId);
	const type = str(action.type);
	if (!activityId || !type || !isActivityType(type)) return null;

	const parts = Array.isArray(action.parts)
		? action.parts
				.map(parsePart)
				.filter((part): part is ActivityPart => part !== null)
		: [];
	if (!parts.length) return null;

	const config = getActivityTypeConfig(type);
	const category: ActivityCategory | undefined =
		oneOf(action.category, ACTIVITY_CATEGORIES) ?? config?.category;
	const rawActor = isRecord(action.actor) ? action.actor : null;
	const actorPart = parts.find((part) => part.kind === "actor");
	const actorName =
		str(rawActor?.name)?.trim() || actorPart?.text.trim() || "System";
	const actorUserId =
		str(rawActor?.userId) ??
		(actorPart?.kind === "actor" ? (actorPart.userId ?? null) : null);

	return {
		kind: "activity",
		activityId,
		type,
		target: isRecord(action.target)
			? (action.target as ActivityNotificationAction["target"])
			: null,
		parts,
		category,
		icon: str(action.icon) ?? config?.icon,
		actor: { userId: actorUserId, name: actorName },
		label: config?.label ?? type.replace(/_/g, " "),
	};
}
