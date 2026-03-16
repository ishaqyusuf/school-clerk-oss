import { prisma } from "./index";

const schools = await prisma.schoolProfile.findMany({
  where: { domains: { none: {} } },
  select: { id: true, subDomain: true, accountId: true },
});

for (const school of schools) {
  await prisma.tenantDomain.create({
    data: {
      subdomain: school.subDomain,
      isPrimary: true,
      isVerified: true,
      schoolProfileId: school.id,
      saasAccountId: school.accountId,
    },
  });
}

console.log(`Backfilled ${schools.length} TenantDomain records`);
await prisma.$disconnect();
