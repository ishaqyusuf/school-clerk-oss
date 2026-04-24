import type { Prisma } from "@prisma/client";

type DbClient = {
  notificationContact: {
    create: (args: {
      data: Prisma.NotificationContactUncheckedCreateInput;
    }) => Promise<any>;
    findFirst: (args: {
      where: Prisma.NotificationContactWhereInput;
    }) => Promise<any>;
    update: (args: {
      where: Prisma.NotificationContactWhereUniqueInput;
      data: Prisma.NotificationContactUncheckedUpdateInput;
    }) => Promise<any>;
  };
};

type NotificationContactLookup =
  | {
      displayName?: string | null;
      role: "guardian";
      schoolProfileId: string;
      guardianId: string;
    }
  | {
      displayName?: string | null;
      role: "staff";
      schoolProfileId: string;
      staffProfileId: string;
    }
  | {
      displayName?: string | null;
      role: "student";
      schoolProfileId: string;
      studentId: string;
    }
  | {
      displayName?: string | null;
      role: "user";
      schoolProfileId: string;
      userId: string;
    };

function buildContactWhere(input: NotificationContactLookup) {
  switch (input.role) {
    case "guardian":
      return { guardianId: input.guardianId };
    case "staff":
      return { staffProfileId: input.staffProfileId };
    case "student":
      return { studentId: input.studentId };
    case "user":
      return { userId: input.userId };
  }
}

function buildContactCreateData(input: NotificationContactLookup): Prisma.NotificationContactUncheckedCreateInput {
  const common = {
    displayName: input.displayName ?? null,
    role: input.role,
    schoolProfileId: input.schoolProfileId,
  } satisfies Pick<
    Prisma.NotificationContactUncheckedCreateInput,
    "displayName" | "role" | "schoolProfileId"
  >;

  switch (input.role) {
    case "guardian":
      return { ...common, guardianId: input.guardianId };
    case "staff":
      return { ...common, staffProfileId: input.staffProfileId };
    case "student":
      return { ...common, studentId: input.studentId };
    case "user":
      return { ...common, userId: input.userId };
  }
}

export async function ensureNotificationContact(
  db: DbClient,
  input: NotificationContactLookup,
) {
  const existing = await db.notificationContact.findFirst({
    where: {
      deletedAt: null,
      schoolProfileId: input.schoolProfileId,
      ...buildContactWhere(input),
    },
  });

  if (existing) {
    if (input.displayName && existing.displayName !== input.displayName) {
      return db.notificationContact.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName,
        },
      });
    }

    return existing;
  }

  return db.notificationContact.create({
    data: buildContactCreateData(input),
  });
}
