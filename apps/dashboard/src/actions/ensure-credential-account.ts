import "server-only";

export const BETTER_AUTH_CREDENTIAL_PROVIDER_ID = "credential";

type CredentialAccountClient = {
	account: {
		upsert(args: {
			create: {
				accountId: string;
				providerId: string;
				userId: string;
			};
			update: {
				deletedAt: null;
				userId: string;
			};
			where: {
				providerId_accountId: {
					accountId: string;
					providerId: string;
				};
			};
		}): Promise<unknown>;
	};
};

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
