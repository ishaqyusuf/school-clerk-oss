import { hashPassword } from "better-auth/crypto";
import { completePasswordRecoveryRecords, getPasswordRecoveryToken, prisma } from "@school-clerk/db";
import { z } from "zod";

const recoverySchema = z.object({
  token: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(128),
});

export async function completePasswordRecovery(input: unknown) {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) throw new Error("A valid reset token and an 8–128 character password are required.");
  if (!await getPasswordRecoveryToken(prisma, parsed.data.token)) throw new Error("Invalid or unavailable reset token.");
  const passwordHash = await hashPassword(parsed.data.newPassword);
  return prisma.$transaction(async (tx) => {
    const context = await getPasswordRecoveryToken(tx, parsed.data.token);
    if (!context) throw new Error("Invalid or unavailable reset token.");
    return completePasswordRecoveryRecords(tx, context, { token: parsed.data.token, passwordHash });
  }, { isolationLevel: "Serializable" });
}
