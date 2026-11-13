import { describe, expect, test } from "bun:test";
import type { ActivityPart, ActivityTypeName } from "@school-clerk/utils/activity";
import {
	bucketByDay,
	burstPillLabels,
	type DigestActivity,
	digestDay,
	summarizeDay,
	sumAttendance,
} from "./activity-digest";

function at(day: number, hour: number, minute = 0) {
	return new Date(2026, 10, day, hour, minute);
}

let seq = 0;
function item(
	type: ActivityTypeName,
	createdAt: Date,
	actor = "u1",
	parts: ActivityPart[] = [],
): DigestActivity {
	seq += 1;
	return {
		id: `a${seq}`,
		type,
		createdAt,
		actor: { userId: actor, name: actor.toUpperCase() },
		parts,
	};
}

const register = (room: string, present: number, absent: number) =>
	[
		{ kind: "actor", text: "Aisha", userId: "u1" },
		{ kind: "text", text: "took attendance for" },
		{ kind: "classroom", text: room, id: room },
		{ kind: "count", text: `${present} present`, tone: "positive" },
		{ kind: "count", text: `${absent} absent`, tone: "negative" },
	] satisfies ActivityPart[];

describe("activity digest", () => {
	test("collapses same-person same-type activity within 45 minutes", () => {
		const items = [
			item("attendance_created", at(13, 8, 40), "u1", register("P3A", 28, 2)),
			item("attendance_created", at(13, 8, 20), "u1", register("P2B", 30, 1)),
			item("attendance_created", at(13, 8, 0), "u1", register("P1A", 25, 0)),
			item("student_payment_received", at(13, 7, 50)),
		];
		const entries = digestDay(items);
		expect(entries.map((entry) => entry.kind)).toEqual(["burst", "single"]);
		const burst = entries[0];
		if (burst?.kind !== "burst") throw new Error("expected burst");
		expect(burst.items).toHaveLength(3);
		expect(sumAttendance(burst.items)).toEqual({ present: 83, absent: 3, late: 0 });
		expect(burstPillLabels(burst.type, burst.items)).toEqual(["P1A", "P2B", "P3A"]);
	});

	test("breaks on a gap over 45 minutes, another actor, or ungroupable type", () => {
		const entries = digestDay([
			item("attendance_created", at(13, 10, 0)),
			item("attendance_created", at(13, 9, 0)),
			item("attendance_created", at(13, 8, 55), "u2"),
			item("student_payment_reversed", at(13, 8, 50), "u2"),
			item("student_payment_reversed", at(13, 8, 49), "u2"),
		]);
		expect(entries.map((entry) => entry.kind)).toEqual([
			"single",
			"single",
			"single",
			"single",
			"single",
		]);
	});

	test("buckets newest-first items by local day and summarizes", () => {
		const items = [
			item("student_payment_received", at(13, 12), "u1", [
				{ kind: "amount", text: "₦45,000", value: 45000, tone: "positive" },
			]),
			item("student_payment_reversed", at(13, 11), "u2", [
				{ kind: "amount", text: "₦12,000", value: 12000, tone: "negative" },
			]),
			item("attendance_created", at(12, 9)),
		];
		const days = bucketByDay(items);
		expect(days.map((day) => day.key)).toEqual(["2026-11-13", "2026-11-12"]);
		expect(summarizeDay(days[0]?.items ?? [])).toEqual({
			activities: 2,
			people: 2,
			registers: 0,
			moneyIn: 45000,
			moneyOut: 12000,
		});
	});
});
