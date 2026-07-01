import { PrismaClient } from "@school-clerk/db";
const prisma = new PrismaClient();
async function main() {
  const verifications = await prisma.verification.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(verifications);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
