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
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.APP_ENV === "production" ||
    process.env.SCHOOL_CLERK_DB_MODE === "prod" ||
    process.env.SCHOOL_CLERK_DB_MODE === "production";
  const isRemoteDev =
    process.env.APP_ENV === "remote-dev" ||
    process.env.DEV_PROFILE === "remote-dev" ||
    process.env.SCHOOL_CLERK_DB_MODE === "remote-dev";
  const configuredUrl = isProduction
    ? (process.env.PROD_DATABASE_URL ??
      process.env.PROD_POSTGRES_URL ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL)
    : isRemoteDev
      ? (process.env.REMOTE_DEV_DATABASE_URL ??
        process.env.REMOTE_DEV_POSTGRES_URL ??
        process.env.DEV_DATABASE_URL ??
        process.env.DEV_POSTGRES_URL ??
        process.env.DATABASE_URL ??
        process.env.POSTGRES_URL)
      : (process.env.DATABASE_URL ?? process.env.POSTGRES_URL);

  if (!configuredUrl) {
    return null;
  }

  return normalizePgConnectionString(configuredUrl);
}

const prismaClientSingleton = () => {
  const connectionString = resolvePrismaConnectionString();

  if (!connectionString) {
    return null;
  }

  const adapter = new PrismaPg({ connectionString });

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
type ConfiguredPrismaClient = NonNullable<PrismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: ConfiguredPrismaClient | undefined;
};

export function createPrismaClient(): ConfiguredPrismaClient | null {
  if (!globalForPrisma.prisma) {
    const client = prismaClientSingleton();

    if (!client) {
      return null;
    }

    globalForPrisma.prisma = client;
  }

  return globalForPrisma.prisma;
}

function requirePrismaClient(): ConfiguredPrismaClient {
  const client = createPrismaClient();

  if (!client) {
    throw new Error("DATABASE_URL must be configured.");
  }

  return client;
}

export type Database = ConfiguredPrismaClient;

export const prisma = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const client = requirePrismaClient();
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
