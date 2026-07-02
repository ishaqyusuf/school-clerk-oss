import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
function normalizePgConnectionString(connectionString) {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    if (sslMode &&
        ["prefer", "require", "verify-ca"].includes(sslMode) &&
        !url.searchParams.has("uselibpqcompat")) {
        url.searchParams.set("uselibpqcompat", "true");
    }
    return url.toString();
}
function resolvePrismaConnectionString() {
    const configuredUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    // Local development is more reliable against Supabase over the direct
    // connection than the transaction pooler, which can fail on DNS/transient issues.
    if (process.env.NODE_ENV !== "production" &&
        process.env.DIRECT_URL &&
        (!configuredUrl || configuredUrl.includes(".pooler.supabase.com:6543"))) {
        return normalizePgConnectionString(process.env.DIRECT_URL);
    }
    if (!configuredUrl) {
        throw new Error("POSTGRES_URL or DATABASE_URL must be configured.");
    }
    return normalizePgConnectionString(configuredUrl);
}
const prismaClientSingleton = () => {
    const adapter = new PrismaPg({
        connectionString: resolvePrismaConnectionString(),
    });
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development"
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
                    if (!args)
                        args = { where: {} };
                    if (!args.where)
                        args.where = {};
                    if (!Object.keys(args.where).includes("deletedAt")) {
                        args.where = { deletedAt: null, ...args.where };
                    }
                    return query(args);
                },
                async findMany({ args, query }) {
                    if (!args)
                        args = { where: {} };
                    if (!args.where)
                        args.where = {};
                    if (!Object.keys(args.where).includes("deletedAt")) {
                        args.where = { deletedAt: null, ...args.where };
                    }
                    return query(args);
                },
            },
        },
    });
};
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
