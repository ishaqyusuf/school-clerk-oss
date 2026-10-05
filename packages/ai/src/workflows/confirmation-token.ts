import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const confirmationLifetimeMs = 10 * 60 * 1000;
const signedConfirmationSchema = z.object({
  version: z.literal(2),
  confirmationId: z.string().regex(/^[a-f0-9]{64}$/),
  conversationId: z.string().min(1),
  schoolId: z.string().min(1),
  userId: z.string().min(1),
  sessionId: z.string().min(1).nullable(),
  termId: z.string().min(1).nullable(),
  toolName: z.string().min(1),
  actionInput: z.record(z.string(), z.unknown()),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
}).strict();

export type SchoolAiConfirmationPayload = {
  conversationId: string;
  schoolId: string;
  userId: string;
  sessionId: string | null;
  termId: string | null;
  toolName: string;
  actionInput: Record<string, unknown>;
};

export type SchoolAiSignedConfirmationPayload = z.infer<typeof signedConfirmationSchema>;

export function schoolAiConfirmationDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSchoolAiConfirmationToken(
  input: SchoolAiConfirmationPayload,
  secret: string,
) {
  const issuedAt = Date.now();
  const payload = JSON.stringify(signedConfirmationSchema.parse({
    ...input,
    version: 2,
    confirmationId: randomBytes(32).toString("hex"),
    issuedAt,
    expiresAt: issuedAt + confirmationLifetimeMs,
  }));
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

    const result = signedConfirmationSchema.safeParse(JSON.parse(decoded.payload));
    if (!result.success) return null;
    const now = Date.now();
    if (result.data.issuedAt > now || result.data.expiresAt <= now ||
      result.data.expiresAt - result.data.issuedAt !== confirmationLifetimeMs) return null;
    return result.data;
  } catch {
    return null;
  }
}
