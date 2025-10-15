import { prisma } from "@school-clerk/db";

export default async function Page() {
  const p = await prisma.schoolProfile.findFirst();
  return (
    <div>
      <p>WWW PAGE!!!</p>
      <div>{JSON.stringify(p)}</div>
    </div>
  );
}
