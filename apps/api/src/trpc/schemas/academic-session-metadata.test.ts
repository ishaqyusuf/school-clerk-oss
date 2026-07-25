import { describe, expect, test } from "bun:test";
import { updateAcademicSessionMetadataSchema } from "./schemas";

describe("updateAcademicSessionMetadataSchema", () => {
  test("accepts renamed sessions with optional dates", () => {
    const result = updateAcademicSessionMetadataSchema.parse({
      sessionId: "session-1",
      title: "2026/2027",
      startDate: null,
      endDate: null,
    });

    expect(result.title).toBe("2026/2027");
    expect(result.startDate).toBeNull();
  });

  test("rejects an end date before the start date", () => {
    const result = updateAcademicSessionMetadataSchema.safeParse({
      sessionId: "session-1",
      title: "2026/2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-08-31"),
    });

    expect(result.success).toBe(false);
  });
});
