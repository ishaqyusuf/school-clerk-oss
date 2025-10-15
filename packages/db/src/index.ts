import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";
// Learn more about instantiating PrismaClient in Next.js here: https://www.prisma.io/docs/data-platform/accelerate/getting-started
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
        // async $allOperations({args,operation})
        // {
        // },
        async findFirst({ model, operation, args, query }) {
          if (!args) args = { where: {} };
          if (!args.where) args.where = {};

          if (!Object.keys(args.where).includes("deletedAt"))
            args.where = { deletedAt: null, ...args.where };
          // args.where = {};
          // console.log(args.where);
          return query(args);
        },
        async findMany({ model, operation, args, query }) {
          if (!args) args = { where: {} };
          if (!args.where) args.where = {};

          if (!Object.keys(args.where).includes("deletedAt"))
            args.where = { deletedAt: null, ...args.where };
          // args.where.deletedAt = null;

          // args.where = {};
          // console.log(args.where);
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
