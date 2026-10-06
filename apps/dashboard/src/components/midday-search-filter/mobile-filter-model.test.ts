import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	type MobileFilterGroup,
	filterGroupSummary,
	filterSheetPatch,
	resetFilterDraft,
	selectFilterOption,
} from "@school-clerk/ui/search-filter/mobile-filter-model";

const groups: [MobileFilterGroup, MobileFilterGroup, MobileFilterGroup] = [
	{
		key: "status",
		label: "Status",
		options: [{ value: "active", label: "Active" }],
	},
	{
		key: "assignees",
		label: "Assignees",
		multiple: true,
		options: [
			{ value: "one", label: "Teacher one" },
			{ value: "two", label: "Teacher two" },
		],
	},
	{ key: "date", label: "Date" },
];

describe("mobile filter editing contract", () => {
	test("single selection is a patch and never mutates applied state", () => {
		const applied = { q: "Maryam", status: "pending", page: 4 };
		assert.deepEqual(
			selectFilterOption(applied, groups[0], {
				value: "active",
				label: "Active",
			}),
			{ status: "active" },
		);
		assert.deepEqual(applied, { q: "Maryam", status: "pending", page: 4 });
	});
	test("assignee multi-select adds and removes without mutating the source array", () => {
		const applied = { assignees: ["one"] };
		assert.deepEqual(
			selectFilterOption(applied, groups[1], {
				value: "two",
				label: "Teacher two",
			}),
			{ assignees: ["one", "two"] },
		);
		assert.deepEqual(
			selectFilterOption(applied, groups[1], {
				value: "one",
				label: "Teacher one",
			}),
			{ assignees: [] },
		);
		assert.deepEqual(applied.assignees, ["one"]);
	});
	test("Apply preserves unrelated URL state by committing only filter keys", () => {
		assert.deepEqual(
			filterSheetPatch(
				{
					q: "Maryam",
					sort: "name",
					page: 4,
					status: "active",
					assignees: ["one"],
					date: ["2026-10-05", "2026-10-06"],
				},
				groups,
			),
			{
				status: "active",
				assignees: ["one"],
				date: ["2026-10-05", "2026-10-06"],
			},
		);
	});
	test("Reset clears drafts, preserving search and the original applied filters", () => {
		const applied = {
			q: "Maryam",
			status: "active",
			assignees: ["one"],
			date: ["today"],
		};
		assert.deepEqual(resetFilterDraft(applied, groups), {
			q: "Maryam",
			status: null,
			assignees: null,
			date: null,
		});
		assert.equal(applied.status, "active");
	});
	test("mandatory scope resets to the consumer's existing default", () => {
		const scoped = [{ key: "period", label: "Period", resetValue: "term" }];
		assert.deepEqual(
			filterSheetPatch(
				resetFilterDraft({ period: "all", q: "Fees" }, scoped),
				scoped,
			),
			{ period: "term" },
		);
	});
	test("summaries use configured labels and preserve unknown loaded values", () => {
		assert.equal(
			filterGroupSummary(groups[1], ["one", "two"]),
			"Teacher one, Teacher two",
		);
		assert.equal(filterGroupSummary(groups[0], null), "All");
		assert.equal(filterGroupSummary(groups[0], "archived"), "archived");
	});
});
