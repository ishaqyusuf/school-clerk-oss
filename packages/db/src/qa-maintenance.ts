import { createHash } from "node:crypto";
import { type Database, prisma } from "./prisma";

export type SchoolClerkDatabase = Database;

function getQaDomainForEmail(email: string) {
	const value = process.env.EMAIL_QA_DOMAIN_ROUTES;
	if (!value) return null;
	const routes = JSON.parse(value) as Record<string, string>;
	const domain = email.trim().toLowerCase().split("@").at(-1) ?? "";
	return Object.keys(routes).some(
		(configured) =>
			configured.trim().toLowerCase().replace(/^\.+/, "") === domain,
	)
		? domain
		: null;
}

export function getQaClassificationForOwner(email: string) {
	const qaSourceDomain = getQaDomainForEmail(email);
	return qaSourceDomain
		? {
				dataClassification: "QA" as const,
				qaSourceDomain,
				qaMarkedAt: new Date(),
			}
		: {
				dataClassification: "NORMAL" as const,
				qaSourceDomain: null,
				qaMarkedAt: null,
			};
}

export async function assertSchoolClerkIdentityLane(
	db: SchoolClerkDatabase,
	input: { email: string; saasAccountId: string },
) {
	const [account, identity] = await Promise.all([
		db.saasAccount.findUniqueOrThrow({
			where: { id: input.saasAccountId },
			select: { dataClassification: true },
		}),
		db.user.findFirst({
			where: { email: { equals: input.email, mode: "insensitive" } },
			select: {
				tenant: { select: { dataClassification: true } },
			},
		}),
	]);
	const emailLane = getQaDomainForEmail(input.email) ? "QA" : "NORMAL";
	const existingLane = identity?.tenant?.dataClassification;
	if (
		account.dataClassification !== emailLane ||
		(existingLane && existingLane !== account.dataClassification)
	) {
		throw new Error("QA and normal identities cannot share a workspace.");
	}
}

export async function discoverQaAccountCandidates(
	db: SchoolClerkDatabase = prisma,
) {
	const routes = [
		...new Set(
			[
				...(process.env.EMAIL_QA_DOMAIN_ROUTES
					? Object.keys(
							JSON.parse(process.env.EMAIL_QA_DOMAIN_ROUTES) as Record<
								string,
								string
							>,
						)
					: []),
			].map((domain) => domain.toLowerCase()),
		),
	];
	if (!routes.length) return [];
	return db.saasAccount.findMany({
		where: {
			dataClassification: "NORMAL",
			OR: routes.map((domain) => ({
				email: { endsWith: `@${domain}`, mode: "insensitive" as const },
			})),
		},
		select: {
			id: true,
			name: true,
			email: true,
			createdAt: true,
			_count: { select: { schools: true, users: true } },
		},
	});
}

export async function adoptQaAccounts(
	accountIds: string[],
	db: SchoolClerkDatabase = prisma,
) {
	return db.$transaction(async (tx) => {
		let adopted = 0;
		for (const id of accountIds) {
			const account = await tx.saasAccount.findUniqueOrThrow({
				where: { id },
				select: { email: true, dataClassification: true },
			});
			const domain = getQaDomainForEmail(account.email);
			if (!domain || account.dataClassification !== "NORMAL") {
				throw new Error("Only configured QA-domain candidates can be adopted.");
			}
			await tx.saasAccount.update({
				where: { id },
				data: {
					dataClassification: "QA",
					qaSourceDomain: domain,
					qaMarkedAt: new Date(),
				},
			});
			adopted += 1;
		}
		return { adopted };
	});
}

export async function previewSchoolClerkQaPurge(
	db: SchoolClerkDatabase = prisma,
) {
	const accounts = await db.saasAccount.findMany({
		where: { dataClassification: "QA" },
		select: {
			id: true,
			qaMarkedAt: true,
			schools: {
				select: {
					id: true,
					_count: {
						select: {
							students: true,
							staffProfiles: true,
							websiteMediaAssets: true,
							enrollmentApplications: true,
						},
					},
					websiteMediaAssets: {
						where: { deletedAt: null },
						select: { id: true, storageKey: true, sourceUrl: true },
					},
				},
			},
			_count: { select: { users: true, schools: true } },
			domains: {
				select: { customDomain: true, subdomain: true },
			},
		},
	});
	const files = accounts.flatMap((account) =>
		account.schools.flatMap((school) =>
			school.websiteMediaAssets.map((asset) => ({
				accountId: account.id,
				schoolId: school.id,
				assetId: asset.id,
				storageKey: asset.storageKey ?? asset.sourceUrl,
			})),
		),
	);
	const counts = accounts.reduce(
		(sum, account) => {
			sum.workspaces += 1;
			sum.schools += account._count.schools;
			sum.users += account._count.users;
			for (const school of account.schools) {
				sum.students += school._count.students;
				sum.staff += school._count.staffProfiles;
				sum.enrollments += school._count.enrollmentApplications;
				sum.files += school._count.websiteMediaAssets;
			}
			return sum;
		},
		{
			workspaces: 0,
			schools: 0,
			users: 0,
			students: 0,
			staff: 0,
			enrollments: 0,
			files: 0,
		},
	);
	const blockers = accounts.flatMap((account) =>
		account.domains
			.filter((domain) => domain.customDomain)
			.map(() => "LIVE_CUSTOM_DOMAIN"),
	);
	if (
		accounts.length > 0 &&
		(!process.env.VERCEL_BEARER_TOKEN?.trim() ||
			!process.env.VERCEL_TEAM_ID?.trim() ||
			!process.env.VERCEL_DASHBOARD_PROJECT_ID?.trim() ||
			!process.env.VERCEL_SITE_PROJECT_ID?.trim())
	) {
		blockers.push("HOSTING_CREDENTIAL_UNAVAILABLE");
	}
	const fingerprint = createHash("sha256")
		.update(
			JSON.stringify({
				accounts: accounts.map((account) => [account.id, account.qaMarkedAt]),
				counts,
			}),
		)
		.digest("hex");
	return { accounts, counts, files, blockers, fingerprint };
}

export async function createSchoolClerkQaPurgeRun(actorUserId: string) {
	return prisma.qaPurgeRun.create({
		data: { actorUserId, activeKey: "global" },
	});
}

export async function beginSchoolClerkQaPurgeRun(runId: string) {
	return prisma.$transaction(async (tx) => {
		await tx.qaPurgeRun.update({
			where: { id: runId },
			data: { status: "RUNNING", startedAt: new Date() },
		});
		await tx.saasAccount.updateMany({
			where: { dataClassification: "QA" },
			data: { qaPurgeStartedAt: new Date() },
		});
		await tx.session.deleteMany({
			where: { user: { tenant: { dataClassification: "QA" } } },
		});
	});
}

export async function getSchoolClerkQaPurgeRun(runId: string) {
	return prisma.qaPurgeRun.findUnique({ where: { id: runId } });
}

export async function deleteSchoolClerkQaAccount(
	accountId: string,
	db: SchoolClerkDatabase = prisma,
) {
	const account = await db.saasAccount.findFirstOrThrow({
		where: {
			id: accountId,
			dataClassification: "QA",
			qaPurgeStartedAt: { not: null },
		},
		select: { _count: { select: { users: true, schools: true } } },
	});
	await db.$transaction(async (tx) => {
		await tx.schoolProfile.deleteMany({ where: { accountId } });
		await tx.user.updateMany({
			where: { saasAccountId: accountId },
			data: { saasAccountId: null },
		});
		await tx.saasAccount.delete({ where: { id: accountId } });
		await tx.user.deleteMany({
			where: {
				saasAccountId: null,
				sessions: { none: {} },
				accounts: { none: {} },
			},
		});
	});
	return {
		workspaces: 1,
		schools: account._count.schools,
		records: account._count.users + account._count.schools + 1,
	};
}

export async function finishSchoolClerkQaPurgeRun(input: {
	id: string;
	status: "COMPLETED" | "PARTIAL" | "FAILED" | "BLOCKED";
	deletedWorkspaceCount?: number;
	deletedSchoolCount?: number;
	deletedRecordCount?: number;
	deletedFileCount?: number;
	deletedFileBytes?: bigint;
	errorCategory?: string;
}) {
	return prisma.qaPurgeRun.update({
		where: { id: input.id },
		data: {
			status: input.status,
			activeKey: null,
			completedAt: new Date(),
			deletedWorkspaceCount: input.deletedWorkspaceCount ?? 0,
			deletedSchoolCount: input.deletedSchoolCount ?? 0,
			deletedRecordCount: input.deletedRecordCount ?? 0,
			deletedFileCount: input.deletedFileCount ?? 0,
			deletedFileBytes: input.deletedFileBytes ?? BigInt(0),
			errorCategory: input.errorCategory,
		},
	});
}
