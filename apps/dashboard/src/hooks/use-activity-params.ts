import { ACTIVITY_TYPES } from "@school-clerk/utils/activity";
import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsString,
	parseAsStringEnum,
} from "nuqs/server";

export const ACTIVITY_RANGES = ["today", "7d", "30d", "custom"] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

export const activityParamsSchema = {
	range: parseAsStringEnum([...ACTIVITY_RANGES]),
	/** `YYYY-MM-DD`, only for range=custom. */
	from: parseAsString,
	to: parseAsString,
	types: parseAsArrayOf(parseAsStringEnum([...ACTIVITY_TYPES])),
	members: parseAsArrayOf(parseAsString),
	q: parseAsString,
	scope: parseAsStringEnum(["mine", "all"] as const),
	/** Opens the overview sheet (deep link from notifications). */
	activityId: parseAsString,
};

export const loadActivityParams = createLoader(activityParamsSchema);

export function useActivityParams() {
	const [params, setParams] = useQueryStates(activityParamsSchema);
	return { params, setParams };
}

function startOfDay(date: Date) {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function parseDay(value: string | null | undefined, endOfDay = false) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
	if (endOfDay) date.setHours(23, 59, 59, 999);
	return date;
}

/** Resolve the range preset into API `from`/`to` bounds (local time). */
export function resolveActivityRange(params: {
	range: ActivityRange | null;
	from: string | null;
	to: string | null;
}): { from: Date | null; to: Date | null } {
	const now = new Date();
	switch (params.range) {
		case "today":
			return { from: startOfDay(now), to: null };
		case "7d":
			return { from: startOfDay(new Date(now.getTime() - 6 * 86_400_000)), to: null };
		case "30d":
			return { from: startOfDay(new Date(now.getTime() - 29 * 86_400_000)), to: null };
		case "custom":
			return { from: parseDay(params.from), to: parseDay(params.to, true) };
		default:
			return { from: null, to: null };
	}
}
