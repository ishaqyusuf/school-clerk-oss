import { createPrismaClient } from "./prisma";

export type SchoolTenantRecord = {
  id: string;
  name: string;
  slug: string;
  studentCount: number;
};

const seedSchoolTenants: SchoolTenantRecord[] = [
  {
    id: "school-crestview-demo",
    name: "Crestview Academy",
    slug: "crestview",
    studentCount: 428,
  },
  {
    id: "school-northfield-demo",
    name: "Northfield College",
    slug: "northfield",
    studentCount: 212,
  },
];

export function listSeedSchoolTenants() {
  return seedSchoolTenants;
}

export async function listSchoolTenants(): Promise<SchoolTenantRecord[]> {
  const db = createPrismaClient();

  if (!db) {
    return listSeedSchoolTenants();
  }

  const tenants = await db.schoolProfile.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      subDomain: true,
      studentCountEstimate: true,
      _count: {
        select: {
          students: true,
        },
      },
    },
  });

  return tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.subDomain,
    studentCount: tenant._count.students || tenant.studentCountEstimate || 0,
  }));
}
