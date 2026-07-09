import { describe, expect, test } from "bun:test";
import {
  createAssessmentPublicLinkToken,
  getEffectiveAssessmentPublicLinkStatus,
  normalizeAssessmentPublicLinkSubjectScope,
  verifyAssessmentPublicLinkToken,
} from "./assessment-public-links-policy";

describe("assessment public link policy", () => {
  test("creates signed tokens that reject tampering", async () => {
    const token = await createAssessmentPublicLinkToken("link-1");

    expect(await verifyAssessmentPublicLinkToken(token)).toEqual({
      id: "link-1",
      valid: true,
    });

    expect(await verifyAssessmentPublicLinkToken(`${token}tampered`)).toEqual({
      id: "link-1",
      valid: false,
    });
  });

  test("resolves effective status from stored state and expiry", () => {
    const now = new Date("2026-07-09T12:00:00.000Z");

    expect(
      getEffectiveAssessmentPublicLinkStatus(
        {
          expiresAt: new Date("2026-07-09T11:59:59.000Z"),
          status: "APPROVED",
        },
        now,
      ),
    ).toBe("EXPIRED");
    expect(
      getEffectiveAssessmentPublicLinkStatus(
        {
          expiresAt: new Date("2026-07-09T13:00:00.000Z"),
          status: "APPROVED",
        },
        now,
      ),
    ).toBe("APPROVED");
    expect(
      getEffectiveAssessmentPublicLinkStatus(
        {
          expiresAt: new Date("2026-07-09T13:00:00.000Z"),
          status: "REVOKED",
        },
        now,
      ),
    ).toBe("REVOKED");
  });

  test("normalizes selected subject scope against current classroom subjects", () => {
    const currentSubjectIds = ["subject-a", "subject-b", "subject-c"];

    expect(
      normalizeAssessmentPublicLinkSubjectScope({
        currentSubjectIds,
        selectedSubjectIds: [],
      }),
    ).toEqual(currentSubjectIds);
    expect(
      normalizeAssessmentPublicLinkSubjectScope({
        currentSubjectIds,
        selectedSubjectIds: ["subject-b", "subject-b", "missing"],
      }),
    ).toEqual(["subject-b"]);
  });
});
