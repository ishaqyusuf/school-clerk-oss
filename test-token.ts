import { prisma } from './packages/db/src/prisma';
async function test() {
  const verifications = await prisma.verification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(verifications);
}
test().catch(console.error);
