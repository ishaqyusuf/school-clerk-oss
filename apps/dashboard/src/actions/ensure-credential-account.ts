import "server-only";

import type { Prisma } from "@school-clerk/db";

export const BETTER_AUTH_CREDENTIAL_PROVIDER_ID = "credential";

type CredentialAccountClient = Pick<Prisma.TransactionClient, "account">;

export async function ensureCredentialAccount(
	db: CredentialAccountClient,
	userId: string,
) {
	await db.account.upsert({
		where: {
			providerId_accountId: {
				accountId: userId,
				providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
			},
		},
		update: {
			deletedAt: null,
			userId,
		},
		create: {
			accountId: userId,
			providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
			userId,
		},
	});
}
