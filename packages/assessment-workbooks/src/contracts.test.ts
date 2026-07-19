import { describe, expect, test } from "bun:test";

import { assessmentWorkbookColumnResolutionSchema } from "./contracts";

describe("assessment workbook column resolution", () => {
  test("allows an uncapped assessment only when its weight is zero", () => {
    const uncapped = assessmentWorkbookColumnResolutionSchema.safeParse({
      kind: "create",
      title: "Pages revised",
      obtainable: null,
      percentageObtainable: 0,
    });
    const weighted = assessmentWorkbookColumnResolutionSchema.safeParse({
      kind: "create",
      title: "Exam",
      obtainable: null,
      percentageObtainable: 10,
    });

    expect(uncapped.success).toBe(true);
    expect(weighted.success).toBe(false);
  });
});
