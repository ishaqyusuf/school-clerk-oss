import { describe, expect, test } from "bun:test";

import { normalizeAssessmentScoreCell } from "./score-normalization";

describe("assessment workbook score normalization", () => {
  test.each([
    ["12.5", 12.5],
    ["١٢٫٥", 12.5],
    ["۱۲٫۵", 12.5],
    ["  ٠٧  ", 7],
    [14, 14],
    [0, 0],
  ])("normalizes literal score %p to %p", (input, expected) => {
    expect(normalizeAssessmentScoreCell(input)).toEqual({
      status: "value",
      value: expected,
      normalizedText: String(expected),
    });
  });

  test.each([null, undefined, "", " \u00a0 "])(
    "treats blank cell %p as a no-change value",
    (input) => {
      expect(normalizeAssessmentScoreCell(input)).toEqual({
        status: "blank",
      });
    },
  );

  test.each([
    ["=10+2", "formula"],
    ["50%", "percentage"],
    ["1e2", "exponent"],
    ["1,000", "grouping-separator"],
    ["١٬٠٠٠", "grouping-separator"],
    ["-1", "negative"],
    [-1, "negative"],
    ["ten", "not-numeric"],
    [Number.POSITIVE_INFINITY, "not-finite"],
    [Number.NaN, "not-finite"],
  ])("rejects unsupported score %p as %s", (input, reason) => {
    expect(normalizeAssessmentScoreCell(input)).toEqual({
      status: "invalid",
      reason,
    });
  });
});
