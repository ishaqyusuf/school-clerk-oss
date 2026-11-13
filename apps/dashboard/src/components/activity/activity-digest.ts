import type { ActivityPart, ActivityTypeName } from "@school-clerk/utils/activity";

/*
 * Grouped digest (Workshop 03, ADR-0093). Consecutive activities by the same
 * person of the same groupable type, on the same day and within 45 minutes of
 * each other, collapse into one "burst" line. Each day opens with a summary.
 * Pure so it can be unit tested.
 */

/** Loose on purpose: the dashboard compiles router outputs non-strictly. */
export type DigestActivity = {
	id?: string;
	type?: ActivityTypeName;
	createdAt?: Date | string | null;
	actor?: { userId?: string | null; name?: string };
	parts?: ActivityPart[];
};

export const GROUPABLE_ACTIVITY_TYPES: readonly ActivityTypeName[] = [
	"attendance_created",
	"student_payment_received",
	"student_created",
	"student_enrolled",
	"student_class_changed",
	"assessment_workbook_imported",
];

export const BURST_WINDOW_MS = 45 * 60_000;

export type DigestEntry<T extends DigestActivity> =
	| { kind: "single"; id: string; item: T }
	| { kind: "burst"; id: string; type: ActivityTypeName; items: T[] };

export type DigestDay<T extends DigestActivity> = {
	key: string;
	date: Date;
	items: T[];
};

export function activityTime(item: Pick<DigestActivity, "createdAt">) {
	return item.createdAt ? new Date(item.createdAt).getTime() : 0;
}

/** Local `YYYY-MM-DD` key. */
export function localDayKey(date: Date) {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/** Items are newest first; days keep that order. */
export function bucketByDay<T extends DigestActivity>(items: readonly T[]) {
	const days: DigestDay<T>[] = [];
	for (const item of items) {
		const date = new Date(activityTime(item));
		const key = localDayKey(date);
		const last = days[days.length - 1];
		if (last && last.key === key) last.items.push(item);
		else days.push({ key, date, items: [item] });
	}
	return days;
}

function sameActor(a: DigestActivity, b: DigestActivity) {
	return (
		(a.actor?.userId ?? `name:${a.actor?.name}`) ===
		(b.actor?.userId ?? `name:${b.actor?.name}`)
	);
}

/** Collapse bursts within one day's newest-first items. */
export function digestDay<T extends DigestActivity>(
	items: readonly T[],
): DigestEntry<T>[] {
	const groups: { type: ActivityTypeName | undefined; items: T[] }[] = [];
	for (const item of items) {
		const group = groups[groups.length - 1];
		const previous = group?.items[group.items.length - 1];
		if (
			group &&
			previous &&
			group.type === item.type &&
			item.type !== undefined &&
			GROUPABLE_ACTIVITY_TYPES.includes(item.type) &&
			sameActor(previous, item) &&
			localDayKey(new Date(activityTime(previous))) ===
				localDayKey(new Date(activityTime(item))) &&
			activityTime(previous) - activityTime(item) <= BURST_WINDOW_MS
		) {
			group.items.push(item);
		} else {
			groups.push({ type: item.type, items: [item] });
		}
	}
	return groups.map((group) => {
		const first = group.items[0] as T;
		return group.items.length > 1
			? {
					kind: "burst" as const,
					id: `burst:${first.id}`,
					type: group.type as ActivityTypeName,
					items: group.items,
				}
			: { kind: "single" as const, id: first.id ?? "", item: first };
	});
}

/** Sum of amount parts across items (payments). */
export function sumAmounts(items: readonly DigestActivity[]) {
	return items.reduce((total, item) => {
		const amount = item.parts?.find((part) => part.kind === "amount");
		return total + (amount && amount.kind === "amount" ? amount.value : 0);
	}, 0);
}

export type AttendanceTotals = { present: number; absent: number; late: number };

/** Totals from the attendance count parts ("28 present", "2 absent"...). */
export function sumAttendance(items: readonly DigestActivity[]): AttendanceTotals {
	const totals: AttendanceTotals = { present: 0, absent: 0, late: 0 };
	for (const item of items) {
		for (const part of item.parts ?? []) {
			if (part.kind !== "count") continue;
			const match = /^([\d,]+)\s+(present|absent|late)\b/.exec(part.text);
			if (!match) continue;
			const key = match[2] as keyof AttendanceTotals;
			totals[key] += Number((match[1] ?? "0").replace(/,/g, ""));
		}
	}
	return totals;
}

export type DaySummary = {
	activities: number;
	people: number;
	registers: number;
	moneyIn: number;
	moneyOut: number;
};

export function summarizeDay(items: readonly DigestActivity[]): DaySummary {
	const people = new Set(
		items.map((item) => item.actor?.userId ?? `name:${item.actor?.name}`),
	);
	return {
		activities: items.length,
		people: people.size,
		registers: items.filter((item) => item.type === "attendance_created")
			.length,
		moneyIn: sumAmounts(
			items.filter((item) => item.type === "student_payment_received"),
		),
		moneyOut: sumAmounts(
			items.filter(
				(item) =>
					item.type === "student_payment_reversed" ||
					item.type === "student_payment_refund",
			),
		),
	};
}

/** Pill labels for a burst: classes for attendance, else student names. */
export function burstPillLabels(type: ActivityTypeName, items: readonly DigestActivity[]) {
	const kind = type === "attendance_created" ? "classroom" : "student";
	return [...items]
		.reverse()
		.map((item) => item.parts?.find((part) => part.kind === kind)?.text)
		.filter((label): label is string => Boolean(label));
}
