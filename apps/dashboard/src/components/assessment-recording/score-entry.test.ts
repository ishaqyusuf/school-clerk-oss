import { describe, expect, test } from "bun:test";
import { getScoreGridMove, parseScoreInput } from "./score-entry";

describe("parseScoreInput", () => {
	test("treats an empty cell as no score", () => {
		expect(parseScoreInput("  ", 10)).toEqual({ value: null, error: null });
	});

	test("accepts scores up to the maximum", () => {
		expect(parseScoreInput("10", 10)).toEqual({ value: 10, error: null });
		expect(parseScoreInput("7.5", 10)).toEqual({ value: 7.5, error: null });
	});

	test("blocks scores above a numeric maximum", () => {
		expect(parseScoreInput("11", 10)).toEqual({
			value: null,
			error: "Maximum is 10",
		});
	});

	test("has no upper bound for uncapped assessments", () => {
		expect(parseScoreInput("250", null)).toEqual({ value: 250, error: null });
	});

	test("rejects negative and malformed values", () => {
		expect(parseScoreInput("-1", null).error).not.toBeNull();
		expect(parseScoreInput("abc", 10).error).not.toBeNull();
		expect(parseScoreInput("Infinity", null).error).not.toBeNull();
	});
});

describe("getScoreGridMove", () => {
	test("Enter and arrows move along the column", () => {
		expect(getScoreGridMove("Enter", false)).toEqual({ rows: 1, cols: 0 });
		expect(getScoreGridMove("Enter", true)).toEqual({ rows: -1, cols: 0 });
		expect(getScoreGridMove("ArrowDown", false)).toEqual({ rows: 1, cols: 0 });
		expect(getScoreGridMove("ArrowUp", false)).toEqual({ rows: -1, cols: 0 });
	});

	test("leaves other keys to the input", () => {
		expect(getScoreGridMove("Tab", false)).toBeNull();
		expect(getScoreGridMove("1", false)).toBeNull();
	});
});
