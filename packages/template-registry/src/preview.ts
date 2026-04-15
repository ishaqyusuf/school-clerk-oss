import { createHmac, timingSafeEqual } from "node:crypto";

function getPreviewSecret() {
  return (
    process.env.WEBSITE_PREVIEW_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    "school-clerk-website-preview"
  );
}

function createPreviewSignature(input: {
  configId: string;
  schoolProfileId: string;
  expiresAt: number;
}) {
  return createHmac("sha256", getPreviewSecret())
    .update(`${input.configId}:${input.schoolProfileId}:${input.expiresAt}`)
    .digest("hex");
}

export function createWebsitePreviewToken(input: {
  configId: string;
  schoolProfileId: string;
  expiresAt?: number;
}) {
  const expiresAt =
    input.expiresAt ?? Date.now() + 1000 * 60 * 60 * 24;
  const signature = createPreviewSignature({
    configId: input.configId,
    schoolProfileId: input.schoolProfileId,
    expiresAt,
  });

  return `${expiresAt}.${signature}`;
}

export function verifyWebsitePreviewToken(input: {
  configId: string;
  schoolProfileId: string;
  token: string;
}) {
  const actual = input.token.trim();

  if (!actual) return false;

  const [expiresAtRaw, signature] = actual.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!signature || Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = createPreviewSignature({
    configId: input.configId,
    schoolProfileId: input.schoolProfileId,
    expiresAt,
  });

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
