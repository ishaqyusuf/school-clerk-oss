import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFilterOptionLabel } from "./filter-label";

const viewOptions = [
  { label: "Stream", value: "stream" },
  { label: "Class", value: "class" },
];

describe("getFilterOptionLabel", () => {
  it("uses the configured label for a scalar filter value", () => {
    assert.equal(getFilterOptionLabel(viewOptions, "class"), "Class");
  });

  it("keeps an unknown filter value readable", () => {
    assert.equal(getFilterOptionLabel(viewOptions, "archived"), "archived");
  });
});
