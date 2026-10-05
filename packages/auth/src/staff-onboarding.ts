import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { completeStaffOnboardingRecords, getStaffOnboardingContext, prisma } from "@school-clerk/db";
import { assertModuleAccess } from "@school-clerk/utils/module-config";
import { STAFF_ROLES } from "@school-clerk/utils/constants";

const inputSchema = z.object({
  token: z.string().min(1).max(256), newPassword: z.string().min(8).max(128),
  staffId: z.string().min(1).max(200), email: z.string().email().transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1).max(200), title: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(), phone2: z.string().trim().max(50).optional(),
  address: z.string().trim().max(1000).optional(),
});

function assertContext(context: Awaited<ReturnType<typeof getStaffOnboardingContext>>) {
  if (!context) throw new Error("This invitation has expired, changed or was used. Try signing in, or request a new staff invitation.");
  z.enum(STAFF_ROLES).parse(context.binding.role);
  assertModuleAccess(context.staff.schoolProfile?.moduleConfiguration, ["STAFF_MANAGEMENT"]);
  return context;
}

export async function completeStaffOnboarding(input: z.input<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);
  assertContext(await getStaffOnboardingContext(prisma, parsed));
  const passwordHash = await hashPassword(parsed.newPassword);
  return prisma.$transaction(async (tx) => {
    const context = assertContext(await getStaffOnboardingContext(tx, parsed));
    return completeStaffOnboardingRecords(tx, context, {
      passwordHash, name: parsed.name, title: parsed.title, phone: parsed.phone,
      phone2: parsed.phone2, address: parsed.address,
    });
  }, { isolationLevel: "Serializable" });
}
