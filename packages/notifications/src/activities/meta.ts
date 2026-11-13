import type {
	ActivityRef,
	AttendanceCounts,
} from "@school-clerk/utils/activity";

/**
 * Defensive readers for `Activity.meta`. Meta is untyped JSON from the
 * database and legacy rows carry older shapes, so every read validates.
 */
export type MetaRecord = Record<string, unknown>;

export function asRecord(value: unknown): MetaRecord | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as MetaRecord)
		: null;
}

export function readString(meta: MetaRecord, key: string): string | null {
	const value = meta[key];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readNumber(meta: MetaRecord, key: string): number | null {
	const value = meta[key];
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function toRef(value: unknown): ActivityRef | null {
	const record = asRecord(value);
	if (!record) return null;
	const id = readString(record, "id");
	const name = readString(record, "name");
	return id && name ? { id, name } : null;
}

export function readRef(meta: MetaRecord, key: string): ActivityRef | null {
	return toRef(meta[key]);
}

export function readRefs(meta: MetaRecord, key: string): ActivityRef[] {
	const value = meta[key];
	if (!Array.isArray(value)) return [];
	return value.map(toRef).filter((ref): ref is ActivityRef => ref !== null);
}

/** `YYYY-MM-DD` calendar day. */
export function readDay(meta: MetaRecord, key: string): string | null {
	const value = readString(meta, key);
	return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Counts need at least present and absent; the rest default to 0. */
export function readCounts(
	meta: MetaRecord,
	key: string,
): AttendanceCounts | null {
	const record = asRecord(meta[key]);
	if (!record) return null;
	const present = readNumber(record, "present");
	const absent = readNumber(record, "absent");
	if (present === null || absent === null) return null;
	const late = readNumber(record, "late") ?? 0;
	const excused = readNumber(record, "excused") ?? 0;
	const leave = readNumber(record, "leave") ?? 0;
	const total =
		readNumber(record, "total") ?? present + absent + late + excused + leave;
	return { total, present, absent, late, excused, leave };
}
