import { describe, expect, test } from "bun:test";

import { classifyAssessmentScoreChange } from "./import-plan";

describe("assessment workbook three-way score comparison", () => {
  test("accepts a new score when the database is still blank", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: null,
        uploaded: "١٢٫٥",
        current: null,
        obtainable: 20,
      }),
    ).toEqual({
      status: "create",
      value: 12.5,
    });
  });

  test("accepts a changed score when the database still matches download", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: 10,
        uploaded: 12,
        current: 10,
        obtainable: 20,
      }),
    ).toEqual({
      status: "update",
      value: 12,
    });
  });

  test("does not write blanks or unchanged values", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: 10,
        uploaded: "",
        current: 10,
        obtainable: 20,
      }),
    ).toEqual({ status: "blank" });

    expect(
      classifyAssessmentScoreChange({
        downloaded: 10,
        uploaded: 10,
        current: 14,
        obtainable: 20,
      }),
    ).toEqual({ status: "unchanged" });
  });

  test("does not write when the uploaded value already matches current data", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: 10,
        uploaded: 14,
        current: 14,
        obtainable: 20,
      }),
    ).toEqual({ status: "unchanged" });
  });

  test("flags independently diverged values as a conflict", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: 10,
        uploaded: 12,
        current: 14,
        obtainable: 20,
      }),
    ).toEqual({
      status: "conflict",
      downloaded: 10,
      uploaded: 12,
      current: 14,
    });
  });

  test("rejects invalid and above-maximum values", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: null,
        uploaded: "=10+2",
        current: null,
        obtainable: 20,
      }),
    ).toEqual({
      status: "invalid",
      reason: "formula",
    });

    expect(
      classifyAssessmentScoreChange({
        downloaded: null,
        uploaded: 21,
        current: null,
        obtainable: 20,
      }),
    ).toEqual({
      status: "invalid",
      reason: "above-maximum",
      maximum: 20,
      value: 21,
    });
  });

  test("accepts any non-negative literal for an uncapped assessment", () => {
    expect(
      classifyAssessmentScoreChange({
        downloaded: null,
        uploaded: 750,
        current: null,
        obtainable: null,
      }),
    ).toEqual({
      status: "create",
      value: 750,
    });
  });
});
