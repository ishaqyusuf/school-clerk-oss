import type { Prisma } from "./generated/client";
import type { ConfiguredPrismaClient } from "./prisma";

type DevelopmentDatabase = Pick<ConfiguredPrismaClient, "schoolProfile" | "user">;

export function getDevelopmentLoginSchool(db: DevelopmentDatabase, domain: string) {
  return db.schoolProfile.findFirst({
    where: { subDomain: domain, deletedAt: null,
      account: { deletedAt: null, qaPurgeStartedAt: null } },
    select: { id: true, accountId: true, name: true },
  });
}

function developmentUserWhere(schoolId: string): Prisma.UserWhereInput {
  return { deletedAt: null,
    tenant: { deletedAt: null, qaPurgeStartedAt: null,
    schools: { some: { id: schoolId, deletedAt: null } } } };
}

export function getLocalLoginSchool(db: DevelopmentDatabase, domain: string) {
  return db.schoolProfile.findFirst({
    where: { subDomain: domain, deletedAt: null,
      account: { deletedAt: null, qaPurgeStartedAt: null } },
    select: { id: true },
  });
}

export function listLocalLoginUsers(db: DevelopmentDatabase, schoolId: string) {
  return db.user.findMany({
    where: { deletedAt: null,
      tenant: { deletedAt: null, qaPurgeStartedAt: null,
        schools: { some: { id: schoolId, deletedAt: null } } } },
    select: developmentUserSelect,
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

const developmentUserSelect = { id: true, email: true, name: true, role: true } satisfies Prisma.UserSelect;

export function listDevelopmentLoginUsers(db: DevelopmentDatabase, schoolId: string) {
  return db.user.findMany({ where: developmentUserWhere(schoolId), select: developmentUserSelect,
    orderBy: { createdAt: "asc" }, take: 100 });
}

export function getDevelopmentLoginUser(db: DevelopmentDatabase, input: { schoolId: string; userId: string }) {
  return db.user.findFirst({ where: { ...developmentUserWhere(input.schoolId), id: input.userId },
    select: developmentUserSelect });
}
