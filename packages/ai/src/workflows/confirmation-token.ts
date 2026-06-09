import { createHmac, timingSafeEqual } from "node:crypto";

export type SchoolAiConfirmationPayload = {
  conversationId: string;
  schoolId: string;
  toolName: string;
  actionInput: Record<string, unknown>;
};

export function buildSchoolAiConfirmationToken(
  input: SchoolAiConfirmationPayload,
  secret: string,
) {
  const payload = JSON.stringify(input);
  const sig = createHmac("sha256", secret).update(payload).digest("hex");

  return Buffer.from(
    JSON.stringify({
      payload,
      sig,
    }),
  ).toString("base64url");
}

export function readSchoolAiConfirmationToken(token: string, secret: string) {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as {
      payload: string;
      sig: string;
    };
    const expected = createHmac("sha256", secret)
      .update(decoded.payload)
      .digest("hex");
    const valid = timingSafeEqual(
      Buffer.from(decoded.sig),
      Buffer.from(expected),
    );
    if (!valid) return null;

    return JSON.parse(decoded.payload) as SchoolAiConfirmationPayload;
  } catch {
    return null;
  }
}
