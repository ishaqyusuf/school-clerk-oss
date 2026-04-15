import { PrismaClient } from "@prisma/client";

// Local development is more reliable against Supabase over the direct
// connection than the transaction pooler, which can fail on DNS/transient issues.
if (
  process.env.NODE_ENV !== "production" &&
  process.env.DIRECT_URL &&
  (!process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL.includes(".pooler.supabase.com:6543"))
) {
  process.env.POSTGRES_URL = process.env.DIRECT_URL;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
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
