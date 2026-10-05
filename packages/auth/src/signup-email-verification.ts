import { randomBytes } from "node:crypto";
import { z } from "zod";
import { completeSignupEmailVerificationRecords, getSignupEmailVerificationDelivery,
  issueSignupEmailVerificationRecord, reissueSignupEmailVerificationRecord, prisma } from "@school-clerk/db";

const confirmationSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  tenantSlug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
});

export async function issueSignupEmailVerification(input: {
  userId: string; schoolId: string; email: string;
}) {
  const parsed = z.object({ userId: z.string().min(1).max(200),
    schoolId: z.string().min(1).max(200), email: z.email().max(320) }).parse(input);
  const token = randomBytes(32).toString("hex");
  const identity = await prisma.$transaction((tx) => issueSignupEmailVerificationRecord(tx, { ...parsed, token }),
    { isolationLevel: "Serializable" });
  return { token, ...identity };
}

export async function loadSignupEmailVerificationDelivery(input: unknown) {
  const parsed = confirmationSchema.safeParse(input);
  return parsed.success ? getSignupEmailVerificationDelivery(prisma, parsed.data) : null;
}

export async function reissueSignupEmailVerification(input: unknown) {
  const parsed = confirmationSchema.omit({ token: true }).extend({
    userId: z.string().min(1).max(200), sessionToken: z.string().min(1).max(512),
  }).parse(input);
  const token = randomBytes(32).toString("hex");
  const result = await prisma.$transaction((tx) => reissueSignupEmailVerificationRecord(tx, { ...parsed, token }),
    { isolationLevel: "Serializable" });
  return result.status === "issued" ? { ...result, token } : result;
}

export async function completeSignupEmailVerification(input: unknown) {
  const parsed = confirmationSchema.safeParse(input);
  if (!parsed.success) throw new Error("Signup email verification is unavailable.");
  return prisma.$transaction((tx) => completeSignupEmailVerificationRecords(tx, parsed.data),
    { isolationLevel: "Serializable" });
}
