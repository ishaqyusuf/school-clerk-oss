import type { Prisma } from "./generated/client";
import type { InstitutionConfigScope } from "./institution-config";
import type { Database } from "./prisma";

type ModuleDatabase = Pick<Database, "schoolProfile" | "schoolModuleConfiguration">;

export function getModuleAccessActor(db: Pick<Database, "user">, userId: string, sessionId: string) {
	return db.user.findFirst({
		where: { id: userId, deletedAt: null,
			sessions: { some: { id: sessionId, userId, deletedAt: null, expiresAt: { gt: new Date() } } },
		},
		select: { id: true, email: true, name: true, role: true, saasAccountId: true },
	});
}

function schoolWhere(scope: InstitutionConfigScope): Prisma.SchoolProfileWhereUniqueInput {
	return {
		id: scope.schoolId,
		deletedAt: null,
		...(scope.platform === true ? {} : { accountId: scope.accountId }),
	};
}

export function getSchoolModuleConfiguration(db: ModuleDatabase, scope: InstitutionConfigScope) {
	return db.schoolProfile.findFirst({
		where: schoolWhere(scope),
		select: {
			id: true,
			institutionType: true,
			moduleConfiguration: {
				select: {
					version: true,
					revision: true,
					enabledModules: true,
					entitledModules: true,
				},
			},
		},
	});
}

export function createSchoolModuleConfiguration(
	db: ModuleDatabase,
	scope: InstitutionConfigScope,
	input: {
		enabledModules: string[];
		entitledModules: string[];
		actorUserId: string;
	},
) {
	// The nested connect enforces school scope during creation. The unique
	// schoolProfileId makes concurrent adoption a conflict, never an overwrite.
	return db.schoolModuleConfiguration.create({
		data: {
			schoolProfile: { connect: schoolWhere(scope) },
			version: 1,
			revision: 0,
			enabledModules: input.enabledModules,
			entitledModules: input.entitledModules,
			updatedByUserId: input.actorUserId,
		},
	});
}

export function updateSchoolEnabledModules(
	db: ModuleDatabase,
	scope: InstitutionConfigScope,
	input: { revision: number; enabledModules: string[]; actorUserId: string },
) {
	return db.schoolModuleConfiguration.updateMany({
		where: {
			schoolProfileId: scope.schoolId,
			schoolProfile: schoolWhere(scope),
			version: 1,
			revision: input.revision,
		},
		data: {
			enabledModules: input.enabledModules,
			revision: { increment: 1 },
			updatedByUserId: input.actorUserId,
		},
	});
}

export function updateSchoolModuleEntitlements(
	db: ModuleDatabase,
	scope: InstitutionConfigScope,
	input: { revision: number; entitledModules: string[]; actorUserId: string },
) {
	return db.schoolModuleConfiguration.updateMany({
		where: {
			schoolProfileId: scope.schoolId,
			schoolProfile: schoolWhere(scope),
			version: 1,
			revision: input.revision,
		},
		data: {
			entitledModules: input.entitledModules,
			revision: { increment: 1 },
			updatedByUserId: input.actorUserId,
		},
	});
}
