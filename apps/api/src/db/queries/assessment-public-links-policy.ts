import { z } from "zod";

export const assessmentPublicLinkStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
]);

export type AssessmentPublicLinkStatus = z.infer<
  typeof assessmentPublicLinkStatusSchema
>;

type LinkStatusInput = {
  expiresAt?: Date | null;
  status: AssessmentPublicLinkStatus;
};

const textEncoder = new TextEncoder();

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";

  for (const byte of uint8) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getAssessmentPublicLinkSecret() {
  const secret =
    process.env.ASSESSMENT_PUBLIC_LINK_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ASSESSMENT_PUBLIC_LINK_SECRET is required in production.");
  }

  return "school-clerk-development-assessment-public-link-secret";
}

async function hmacSha256(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getAssessmentPublicLinkSecret()),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );

  return crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
}

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", textEncoder.encode(value));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function createAssessmentPublicLinkToken(id: string) {
  const signature = base64Url(await hmacSha256(id));
  return `${id}.${signature}`;
}

export async function verifyAssessmentPublicLinkToken(token: string) {
  const [id, signature] = token.split(".");

  if (!id || !signature) {
    return { id: id ?? null, valid: false };
  }

  const expected = await createAssessmentPublicLinkToken(id);
  const expectedSignature = expected.split(".")[1] ?? "";

  return {
    id,
    valid: constantTimeEqual(signature, expectedSignature),
  };
}

export async function hashAssessmentPublicLinkToken(token: string) {
  return base64Url(await sha256(token));
}

export function getEffectiveAssessmentPublicLinkStatus(
  link: LinkStatusInput,
  now = new Date(),
): AssessmentPublicLinkStatus {
  if (link.status !== "APPROVED") {
    return link.status;
  }

  if (link.expiresAt && link.expiresAt <= now) {
    return "EXPIRED";
  }

  return "APPROVED";
}

export function normalizeAssessmentPublicLinkSubjectScope({
  currentSubjectIds,
  selectedSubjectIds,
}: {
  currentSubjectIds: string[];
  selectedSubjectIds: string[];
}) {
  const current = new Set(currentSubjectIds);
  const selected = selectedSubjectIds.filter((id) => current.has(id));
  const source = selected.length ? selected : currentSubjectIds;

  return Array.from(new Set(source));
}
