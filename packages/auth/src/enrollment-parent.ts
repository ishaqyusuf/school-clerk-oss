import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { completeEnrollmentParentIdentity, getEnrollmentParentAccess, prisma } from "@school-clerk/db";
import { assertModuleAccess } from "@school-clerk/utils/module-config";

const scopeSchema = z.object({
  applicationId: z.string().min(1), code: z.string().min(1),
  parentId: z.string().min(1), schoolId: z.string().min(1),
  accountId: z.string().min(1), email: z.email(),
});
const setupInputSchema = z.object({ applicationId: z.string().min(1), code: z.string().min(1) });
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const passwordSchema = z.string().min(8).max(128);
const TTL_MS = 30 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;
const requiredModules = ["ADMISSION_ENROLLMENT", "PARENT_PORTAL"] as const;

function identifierFor(token: string) {
  return `enrollment-parent-setup:${createHash("sha256").update(token).digest("hex")}`;
}

function assertContext(application: Awaited<ReturnType<typeof getEnrollmentParentAccess>>, code: string) {
  const parent = application?.parents[0];
  if (!application || !parent?.email || !application.schoolProfile.accountId) {
    throw new Error("Parent setup is unavailable. Please contact the school.");
  }
  assertModuleAccess(application.schoolProfile.moduleConfiguration, requiredModules);
  const scope = scopeSchema.parse({
    applicationId: application.id, code,
    parentId: parent.id, schoolId: application.schoolProfileId,
    accountId: application.schoolProfile.accountId, email: parent.email.trim().toLowerCase(),
  });
  return { application, parent, scope };
}

export async function requestEnrollmentParentSetup(
  input: z.input<typeof setupInputSchema>,
  deliver: (message: { token: string; email: string; name: string; schoolName: string; subDomain: string }) => Promise<void>,
) {
  const parsed = setupInputSchema.parse(input);
  const context = assertContext(await getEnrollmentParentAccess(prisma, parsed), parsed.code);
  const token = randomBytes(32).toString("hex");
  const identifier = identifierFor(token);
  const id = `enrollment-parent-setup:${context.parent.id}`;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const previous = await tx.verification.findUnique({ where: { id } });
    if (previous?.updatedAt && now.getTime() - previous.updatedAt.getTime() < RESEND_INTERVAL_MS) {
      throw new Error("Please wait one minute before requesting another setup email.");
    }
    const data = {
      identifier, value: JSON.stringify(context.scope),
      expiresAt: new Date(now.getTime() + TTL_MS), updatedAt: now, deletedAt: null,
    };
    await tx.verification.upsert({ where: { id }, create: { id, ...data }, update: data });
  }, { isolationLevel: "Serializable" });
  try {
    await deliver({
      token, email: context.scope.email, name: context.parent.name,
      schoolName: context.application.schoolProfile.name,
      subDomain: context.application.schoolProfile.subDomain,
    });
  } catch {
    await prisma.verification.deleteMany({ where: { id, identifier } });
    throw new Error("The setup email could not be sent. Please try again later.");
  }
}

export async function completeEnrollmentParentSetup(input: {
  token: string; password: string; applicationId: string; code: string;
}) {
  const token = tokenSchema.parse(input.token);
  const password = passwordSchema.parse(input.password);
  const parsed = setupInputSchema.parse(input);
  const identifier = identifierFor(token);
  // Reject unknown/expired tokens before the intentionally expensive password hash.
  const existing = await prisma.verification.findFirst({
    where: { identifier, deletedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!existing) throw new Error("This setup link has expired or was already used. Request another email.");
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    const verification = await tx.verification.findFirst({
      where: { id: existing.id, identifier, deletedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!verification) throw new Error("This setup link has expired or was already used. Request another email.");
    const stored = scopeSchema.parse(JSON.parse(verification.value));
    const context = assertContext(await getEnrollmentParentAccess(tx, parsed), parsed.code);
    if (stored.applicationId !== parsed.applicationId || stored.code !== parsed.code ||
      stored.parentId !== context.scope.parentId || stored.schoolId !== context.scope.schoolId ||
      stored.accountId !== context.scope.accountId || stored.email !== context.scope.email) {
      throw new Error("The application changed. Request a new setup email.");
    }
    const claimed = await tx.verification.deleteMany({
      where: { id: verification.id, identifier, expiresAt: { gt: new Date() } },
    });
    if (claimed.count !== 1) throw new Error("This setup link has already been used.");
    const result = await completeEnrollmentParentIdentity(tx, {
      ...stored, name: context.parent.name, passwordHash,
      guardianId: context.parent.linkedGuardianId, studentId: context.application.acceptedStudentId,
    });
    return { ...result, subDomain: context.application.schoolProfile.subDomain };
  }, { isolationLevel: "Serializable" });
}
