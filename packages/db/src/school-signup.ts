import { Prisma } from "./generated/client";
import { getQaClassificationForOwner } from "./qa-maintenance";

export type SchoolSignupRecordsInput = {
  email: string; adminName: string; phone: string | null; passwordHash: string;
  institutionName: string; institutionType: string; schoolSlug: string; domainName: string;
  studentCountEstimate: number | null; country: string | null; educationSystem: string | null;
  curriculumType: string | null; languageOfInstruction: string | null;
};

export async function hasSignupDomainTable(db: Pick<Prisma.TransactionClient, "tenantDomain">) {
  try {
    await db.tenantDomain.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021" &&
      (error.meta?.modelName === "TenantDomain" || error.message.includes("TenantDomain"))) return false;
    throw error;
  }
}

export async function getSignupDomainCollision(db: Pick<Prisma.TransactionClient, "schoolProfile" | "tenantDomain">,
  input: { domainName: string; domainTableAvailable: boolean }) {
  const school = await db.schoolProfile.findFirst({ where: { deletedAt: {},
    subDomain: { equals: input.domainName, mode: "insensitive" } }, select: { id: true } });
  if (school || !input.domainTableAvailable) return school;
  return db.tenantDomain.findFirst({ where: { deletedAt: {}, OR: [
    { subdomain: { equals: input.domainName, mode: "insensitive" } },
    { customDomain: { equals: input.domainName, mode: "insensitive" } },
  ] }, select: { id: true } });
}

// Caller owns one Serializable transaction; never merge or restore an identity.
export async function createSchoolSignupRecords(db: Prisma.TransactionClient,
  input: SchoolSignupRecordsInput, options: { domainTableAvailable: boolean }) {
  // The shared client hides soft-deleted rows unless deletedAt is explicit.
  const [user, domain] = await Promise.all([
    db.user.findFirst({ where: { deletedAt: {}, email: { equals: input.email, mode: "insensitive" } }, select: { id: true } }),
    getSignupDomainCollision(db, { domainName: input.domainName, ...options }),
  ]);
  if (user || domain) throw new Error("The email or school address is unavailable. Sign in or choose different details.");

  const account = await db.saasAccount.create({ data: {
    email: input.email, name: input.adminName, phoneNo: input.phone,
    ...getQaClassificationForOwner(input.email),
  }, select: { id: true } });
  const profile = await db.schoolProfile.create({ data: {
    name: input.institutionName, slug: input.schoolSlug, subDomain: input.domainName,
    institutionType: input.institutionType, studentCountEstimate: input.studentCountEstimate,
    country: input.country, educationSystem: input.educationSystem, curriculumType: input.curriculumType,
    languageOfInstruction: input.languageOfInstruction, accountId: account.id,
  }, select: { id: true, name: true, subDomain: true } });
  if (options.domainTableAvailable) await db.tenantDomain.create({ data: {
    subdomain: input.domainName, isPrimary: true, isVerified: true,
    schoolProfileId: profile.id, saasAccountId: account.id,
  } });
  const owner = await db.user.create({ data: {
    email: input.email, name: input.adminName, phoneNo: input.phone, saasAccountId: account.id,
    role: "Admin", emailVerified: false, password: null,
  }, select: { id: true } });
  await db.account.create({ data: {
    userId: owner.id, accountId: owner.id, providerId: "credential", password: input.passwordHash,
  } });
  return { accountId: account.id, schoolId: profile.id, schoolName: profile.name,
    subDomain: profile.subDomain, userId: owner.id };
}
