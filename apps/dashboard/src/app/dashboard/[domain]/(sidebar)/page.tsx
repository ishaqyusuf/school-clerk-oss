import { prisma } from "@school-clerk/db";
export default async function Page({ params }) {
  const u = await prisma.account.findMany({
    where: {},
  });
  return <div>abac: {u?.length}</div>;
}
