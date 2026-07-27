import { PrismaInstrumentation } from "@prisma/instrumentation";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
			syncEnvVars(
				() =>
					Object.fromEntries(
						[
							"DATABASE_URL",
							"EMAIL_DELIVERY_MODE",
							"EMAIL_QA_DOMAIN_ROUTES",
							"RESEND_API_KEY",
							"RESEND_FROM_EMAIL",
							"BLOB_READ_WRITE_TOKEN",
							"QA_MAINTENANCE_SECRET",
							"VERCEL_BEARER_TOKEN",
							"VERCEL_TEAM_ID",
							"VERCEL_DASHBOARD_PROJECT_ID",
							"VERCEL_SITE_PROJECT_ID",
							"APP_ROOT_DOMAIN",
							"SCHOOL_SITE_ROOT_DOMAIN",
						].flatMap((key) => {
							const value = process.env[key]?.trim();
							return value ? [[key, value]] : [];
						}),
					),
				{ override: true },
			),
      prismaExtension({
        // version: "5.20.0", // optional, we'll automatically detect the version if not provided
        // update this to the path of your Prisma schema file
        version: "^6.5.0",
        directUrlEnvVarName: "DATABASE_URL",
        schema: "./src/schema.prisma",
        // typedSql: true,
        // migrate: true,
      }),
    ],
    external: ["canvas"],
  },
  dirs: ["./src/tasks"],
  instrumentations: [new PrismaInstrumentation()],
});
