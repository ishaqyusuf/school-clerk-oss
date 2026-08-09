import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import type { BuildExtension } from "@trigger.dev/build";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

const execFileAsync = promisify(execFile);

const generateDatabaseClient: BuildExtension = {
	name: "generate-database-prisma-client",
	async onBuildStart(context) {
		if (context.target === "dev") return;

		context.logger.progress("Generating @school-clerk/db Prisma client");
		const prismaCliPath = await context.resolvePath("prisma/build/index.js");
		if (!prismaCliPath) {
			throw new Error("Unable to resolve the Prisma CLI in the Trigger build workspace");
		}
		await execFileAsync(
			process.execPath,
			[
				prismaCliPath,
				"generate",
				"--schema=src/schema",
			],
			{
				cwd: `${context.workingDir}/../db`,
				env: {
					...process.env,
					DATABASE_URL:
						process.env.DATABASE_URL ??
						"postgresql://postgres:postgres@localhost:5432/school_clerk",
				},
			},
		);
	},
};

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
			generateDatabaseClient,
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
