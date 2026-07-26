// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";
import {
	buildTermSwitcherModel,
	getVisibleTermGroups,
	parseTermSwitcherSessions,
} from "./term-switcher-model";

const sessions = [
	{
		id: "session-new",
		name: "2026/2027",
		status: "current",
		terms: [
			{
				id: "term-new",
				startDate: "2026-09-01",
				status: "active",
				title: "First Term",
			},
			{
				id: "term-draft",
				startDate: null,
				status: "draft",
				title: "Draft Term",
			},
		],
	},
	{
		id: "session-old",
		name: "2025/2026",
		status: "archived",
		terms: [
			{
				id: "term-old",
				startDate: "2025-09-01",
				status: "completed",
				title: "Third Term",
			},
		],
	},
];

describe("buildTermSwitcherModel", () => {
	test("groups scheduled terms from every academic session", () => {
		const model = buildTermSwitcherModel(sessions, "session-new", "term-new");

		expect(model.groups.map((session) => session.id)).toEqual([
			"session-new",
			"session-old",
		]);
		expect(model.groups[0]?.terms.map((term) => term.id)).toEqual(["term-new"]);
		expect(model.groups[1]?.terms.map((term) => term.id)).toEqual(["term-old"]);
	});

	test("resolves the displayed session from the selected term", () => {
		const model = buildTermSwitcherModel(sessions, "session-new", "term-old");

		expect(model.currentSession?.id).toBe("session-old");
		expect(model.currentTerm?.id).toBe("term-old");
	});

	test("exposes cross-session groups only to administrators", () => {
		const model = buildTermSwitcherModel(sessions, "session-new", "term-new");

		expect(
			getVisibleTermGroups(model.groups, true, "session-new").map(
				(session) => session.id,
			),
		).toEqual(["session-new", "session-old"]);
		expect(
			getVisibleTermGroups(model.groups, false, "session-new").map(
				(session) => session.id,
			),
		).toEqual(["session-new"]);
	});

	test("rejects incomplete academic session data", () => {
		expect(() =>
			parseTermSwitcherSessions([
				{
					id: "session-new",
					name: "2026/2027",
					terms: [{ id: "term-new", title: "First Term" }],
				},
			]),
		).toThrow("Academic dashboard returned incomplete session data.");
	});

	test("rejects invalid session field types", () => {
		expect(() =>
			parseTermSwitcherSessions([
				{
					id: "session-new",
					name: "2026/2027",
					status: 42,
					terms: [
						{
							id: "term-new",
							startDate: {},
							status: "active",
							title: "First Term",
						},
					],
				},
			]),
		).toThrow("Academic dashboard returned incomplete session data.");
	});

	test("accepts hydrated Date values from SuperJSON callers", () => {
		const parsed = parseTermSwitcherSessions([
			{
				id: "session-new",
				name: "2026/2027",
				status: "current",
				terms: [
					{
						id: "term-new",
						startDate: new Date("2026-09-01T00:00:00.000Z"),
						status: "active",
						title: "First Term",
					},
				],
			},
		]);

		expect(parsed[0]?.terms[0]?.id).toBe("term-new");
	});
});
