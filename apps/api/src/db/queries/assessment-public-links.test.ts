import { describe, expect, test } from "bun:test";
import {
  createAssessmentPublicLinkAccessCode,
  createAssessmentPublicLinkAccessGrant,
  createAssessmentPublicLinkToken,
  getEffectiveAssessmentPublicLinkStatus,
  normalizeAssessmentPublicLinkSubjectScope,
  verifyAssessmentPublicLinkAccessCode,
  verifyAssessmentPublicLinkAccessGrant,
  verifyAssessmentPublicLinkToken,
} from "./assessment-public-links-policy";

describe("assessment public link policy", () => {
  test("derives a stable 6-digit access code per link", async () => {
    const code = await createAssessmentPublicLinkAccessCode("link-1");

    expect(code).toMatch(/^\d{6}$/);
    expect(await createAssessmentPublicLinkAccessCode("link-1")).toBe(code);
    expect(await verifyAssessmentPublicLinkAccessCode("link-1", code)).toBe(true);
    expect(
      await verifyAssessmentPublicLinkAccessCode("link-1", `${code.slice(0, 3)} ${code.slice(3)}`),
    ).toBe(true);
    expect(await verifyAssessmentPublicLinkAccessCode("link-2", code)).toBe(
      code === (await createAssessmentPublicLinkAccessCode("link-2")),
    );
    expect(await verifyAssessmentPublicLinkAccessCode("link-1", "12345")).toBe(false);
  });

  test("accepts only the grant issued for the same link", async () => {
    const grant = await createAssessmentPublicLinkAccessGrant("link-1");

    expect(await verifyAssessmentPublicLinkAccessGrant("link-1", grant)).toBe(true);
    expect(await verifyAssessmentPublicLinkAccessGrant("link-2", grant)).toBe(false);
    expect(await verifyAssessmentPublicLinkAccessGrant("link-1", null)).toBe(false);
    expect(await verifyAssessmentPublicLinkAccessGrant("link-1", `${grant}x`)).toBe(false);
  });

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
