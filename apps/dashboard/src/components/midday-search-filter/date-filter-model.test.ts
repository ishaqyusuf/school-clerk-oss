// @ts-expect-error Bun test types are not included by this app tsconfig.
import { describe, expect, test } from "bun:test";

import {
  dateFilterValueToSelection,
  dateRangeSelectionToFilterValue,
  formatDateFilterLabel,
  isValidDateFilterValue,
  normalizeDateFilterValue,
} from "./date-filter-model";

describe("date filter model", () => {
  test("normalizes array and legacy comma-separated query values", () => {
    expect(normalizeDateFilterValue(["2025-01-10", "2025-01-20"])).toEqual([
      "2025-01-10",
      "2025-01-20",
    ]);
    expect(normalizeDateFilterValue("2025-01-10,2025-01-20")).toEqual([
      "2025-01-10",
      "2025-01-20",
    ]);
  });

  test("serializes a partial calendar range as a valid single-day filter", () => {
    expect(
      dateRangeSelectionToFilterValue({ from: new Date(2025, 0, 10) }),
    ).toEqual(["2025-01-10"]);
    expect(dateRangeSelectionToFilterValue()).toBeNull();
  });

  test("formats presets and custom ranges for filter chips", () => {
    expect(formatDateFilterLabel(["this month"])).toBe("This month");
    expect(formatDateFilterLabel(["2025-01-10", "2025-01-20"])).toBe(
      "Jan 10, 2025 – Jan 20, 2025",
    );
  });

  test("rejects malformed and reversed dates without constructing invalid calendar values", () => {
    expect(isValidDateFilterValue(["2025-99-99"])).toBe(false);
    expect(isValidDateFilterValue(["2025-01-20", "2025-01-10"])).toBe(
      false,
    );
    expect(dateFilterValueToSelection(["2025-99-99"])).toBeUndefined();
    expect(formatDateFilterLabel(["2025-99-99"])).toBe("2025-99-99");
  });
});
