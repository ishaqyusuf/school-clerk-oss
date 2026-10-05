import type { Prisma } from "./generated/client";
import type { Database } from "./prisma";

type InstitutionDatabase = Pick<Database, "schoolProfile">;

// An unscoped call must explicitly opt into platform access. API callers are
// responsible for authorizing that branch before reaching the database layer.
export type InstitutionConfigScope = {
	schoolId: string;
} & ({ accountId: string; platform?: never } | { platform: true; accountId?: never });

function institutionWhere(scope: InstitutionConfigScope): Prisma.SchoolProfileWhereInput {
	return {
		id: scope.schoolId,
		deletedAt: null,
		...(scope.platform === true ? {} : { accountId: scope.accountId }),
	};
}

export function getSchoolInstitutionConfig(db: InstitutionDatabase, scope: InstitutionConfigScope) {
	return db.schoolProfile.findFirst({
		where: institutionWhere(scope),
		select: { id: true, name: true, institutionType: true },
	});
}

export function updateSchoolInstitutionConfig(
	db: InstitutionDatabase,
	scope: InstitutionConfigScope,
	institutionType: string,
) {
	return db.schoolProfile.updateMany({
		where: institutionWhere(scope),
		data: { institutionType },
	});
}
