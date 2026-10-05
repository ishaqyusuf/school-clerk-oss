import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { createSchoolSignupRecords, hasSignupDomainTable, prisma } from "@school-clerk/db";
import { slugify } from "@school-clerk/utils";
import { institutionTypeSchema } from "@school-clerk/utils/institution-config";

const reservedSubdomains = new Set([
  "admin", "api", "app", "dashboard", "demo", "docs", "help", "login", "school-clerk",
  "school-clerk-dashboard", "sign-in", "sign-up", "staff", "support", "www",
]);
const optionalMetadata = z.string().trim().max(200).optional().transform((value) => value || null);
const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  adminName: z.string().trim().min(2).max(200),
  institutionName: z.string().trim().min(2).max(200),
  institutionType: z.string(),
  domainName: z.string().trim().toLowerCase().min(2).max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
    .refine((value) => !reservedSubdomains.has(value), "That subdomain is reserved."),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(40).optional().transform((value) => value || null),
  studentCount: z.string().trim().max(30).optional(),
  country: optionalMetadata, educationSystem: optionalMetadata,
  curriculumType: optionalMetadata, languageOfInstruction: optionalMetadata,
});

export async function createSchoolOwnerAccount(input: unknown) {
  const parsed = signupSchema.parse(input);
  const institutionType = institutionTypeSchema.parse(parsed.institutionType);
  const digits = parsed.studentCount?.replace(/[^\d]/g, "");
  const studentCountEstimate = digits ? Number(digits) : null;
  if (studentCountEstimate !== null && (!Number.isInteger(studentCountEstimate) || studentCountEstimate > 2_147_483_647)) {
    throw new Error("Student estimate is outside the supported range.");
  }
  const domainTableAvailable = await hasSignupDomainTable(prisma);
  const passwordHash = await hashPassword(parsed.password);
  return prisma.$transaction((tx) => createSchoolSignupRecords(tx, {
    email: parsed.email, adminName: parsed.adminName, phone: parsed.phone, passwordHash,
    institutionName: parsed.institutionName, institutionType, schoolSlug: slugify(parsed.institutionName),
    domainName: parsed.domainName, studentCountEstimate, country: parsed.country,
    educationSystem: parsed.educationSystem, curriculumType: parsed.curriculumType,
    languageOfInstruction: parsed.languageOfInstruction,
  }, { domainTableAvailable }), { isolationLevel: "Serializable" });
}
