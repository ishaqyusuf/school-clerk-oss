"use server";

import { prisma } from "@school-clerk/db";
import { BETTER_AUTH_CREDENTIAL_PROVIDER_ID } from "./ensure-credential-account";

const RESET_PASSWORD_TTL_MS = 10 * 60 * 1000;
const RESTORE_IDENTIFIER_PREFIX = "dev-quick-login-restore";

type RestorePayload = {
  userId: string;
  hadCredentialAccount: boolean;
  previousPassword: string | null;
};

function assertDevelopment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev quick login is not available in production.");
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function resolveDevQuickLoginUser({
  domain,
  email,
}: {
  domain: string;
  email: string;
}) {
  const normalizedEmail = normalizeEmail(email);

  const tenant = await prisma.schoolProfile.findFirst({
    where: {
      deletedAt: null,
      subDomain: domain,
      account: {
        users: {
          some: {
            deletedAt: null,
            email: {
              equals: normalizedEmail,
              mode: "insensitive",
            },
          },
        },
      },
    },
    select: {
      account: {
        select: {
          users: {
            where: {
              deletedAt: null,
              email: {
                equals: normalizedEmail,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              email: true,
              role: true,
            },
            take: 1,
          },
        },
      },
      staffProfiles: {
        where: {
          deletedAt: null,
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          onboardedAt: true,
        },
        take: 1,
      },
    },
  });

  const user = tenant?.account?.users[0];
  if (!user) {
    throw new Error("Quick login user was not found for this tenant.");
  }

  const staff = tenant?.staffProfiles[0] ?? null;
  const isOnboarded =
    user.role === "ADMIN" || !staff || staff.onboardedAt !== null;

  return {
    user,
    staff,
    isOnboarded,
  };
}

export async function prepareDevQuickLogin(input: {
  domain: string;
  email: string;
}) {
  assertDevelopment();

  const { user, staff, isOnboarded } = await resolveDevQuickLoginUser(input);
  const resetToken = crypto.randomUUID();
  const restoreToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + RESET_PASSWORD_TTL_MS);

  await prisma.$transaction(async (tx) => {
    const existingCredential = await tx.account.findUnique({
      where: {
        providerId_accountId: {
          accountId: user.id,
          providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
        },
      },
      select: {
        password: true,
      },
    });

    await tx.account.upsert({
      where: {
        providerId_accountId: {
          accountId: user.id,
          providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
        },
      },
      update: {
        deletedAt: null,
        userId: user.id,
      },
      create: {
        accountId: user.id,
        providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
        userId: user.id,
      },
    });

    await tx.verification.create({
      data: {
        identifier: `reset-password:${resetToken}`,
        value: user.id,
        expiresAt,
      },
    });

    if (isOnboarded) {
      const restorePayload: RestorePayload = {
        userId: user.id,
        hadCredentialAccount: existingCredential !== null,
        previousPassword: existingCredential?.password ?? null,
      };

      await tx.verification.create({
        data: {
          identifier: `${RESTORE_IDENTIFIER_PREFIX}:${restoreToken}`,
          value: JSON.stringify(restorePayload),
          expiresAt,
        },
      });
    }
  });

  return {
    email: user.email,
    isOnboarded,
    resetToken,
    restoreToken: isOnboarded ? restoreToken : null,
    staffId: staff?.id ?? null,
  };
}

export async function restoreDevQuickLoginCredential(input: {
  restoreToken: string;
}) {
  assertDevelopment();

  if (!input.restoreToken) {
    return { restored: false };
  }

  const identifier = `${RESTORE_IDENTIFIER_PREFIX}:${input.restoreToken}`;
  const verification = await prisma.verification.findFirst({
    where: {
      identifier,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      value: true,
    },
  });

  if (!verification) {
    return { restored: false };
  }

  const payload = JSON.parse(verification.value) as RestorePayload;

  await prisma.$transaction(async (tx) => {
    if (payload.hadCredentialAccount) {
      await tx.account.update({
        where: {
          providerId_accountId: {
            accountId: payload.userId,
            providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
          },
        },
        data: {
          deletedAt: null,
          password: payload.previousPassword,
        },
      });
    } else {
      await tx.account.deleteMany({
        where: {
          accountId: payload.userId,
          providerId: BETTER_AUTH_CREDENTIAL_PROVIDER_ID,
        },
      });
    }

    await tx.verification.deleteMany({
      where: {
        identifier,
      },
    });
  });

  return { restored: true };
}
