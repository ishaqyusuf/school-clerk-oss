import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

function normalizePgConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (
    sslMode &&
    ["prefer", "require", "verify-ca"].includes(sslMode) &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function resolvePrismaConnectionString() {
  const configuredUrl = process.env.DATABASE_URL;

  if (!configuredUrl) {
    throw new Error("DATABASE_URL must be configured.");
  }

  return normalizePgConnectionString(configuredUrl);
}

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: resolvePrismaConnectionString(),
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            // "query",
            "error",
            "warn",
          ]
        : ["error"],
  }).$extends({
    query: {
      $allModels: {
        async findFirst({ args, query }) {
          if (!args) args = { where: {} };
          if (!args.where) args.where = {};

          if (!Object.keys(args.where).includes("deletedAt")) {
            args.where = { deletedAt: null, ...args.where };
          }

          return query(args);
        },
        async findMany({ args, query }) {
          if (!args) args = { where: {} };
          if (!args.where) args.where = {};

          if (!Object.keys(args.where).includes("deletedAt")) {
            args.where = { deletedAt: null, ...args.where };
          }

          return query(args);
        },
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
export type Database = typeof prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
