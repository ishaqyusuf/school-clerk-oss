import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig, env } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const workspaceDir = path.dirname(__filename);
const repoRoot = path.resolve(workspaceDir, "../..");

function mergeEnvFile(
	filePath: string,
	targetEnv: Record<string, string | undefined>,
) {
	if (!existsSync(filePath)) {
		return;
	}

	const parsed = parseEnv(readFileSync(filePath, "utf8"));

	for (const [key, value] of Object.entries(parsed)) {
		if (value !== undefined) {
			targetEnv[key] = value;
		}
	}
}

function normalizeMode() {
	if (
		process.env.SCHOOL_CLERK_DB_MODE === "prod" ||
		process.env.SCHOOL_CLERK_DB_MODE === "production"
	) {
		return "prod";
	}

	if (
		process.env.SCHOOL_CLERK_DB_MODE === "remote" ||
		process.env.SCHOOL_CLERK_DB_MODE === "remote-dev"
	) {
		return "remote";
	}

	if (
		process.env.NODE_ENV === "production" ||
		process.env.APP_ENV === "production"
	) {
		return "prod";
	}

	return "local";
}

function envFilesForMode(mode: string) {
	if (mode === "prod") {
		const prodFile = path.join(repoRoot, ".env.prod");

		return existsSync(prodFile)
			? [prodFile]
			: [path.join(repoRoot, ".env.production")];
	}

	if (mode === "remote") {
		return [
			path.join(repoRoot, ".env.local"),
			path.join(repoRoot, ".env.remote.local"),
		];
	}

	return [path.join(repoRoot, ".env.local")];
}

function loadEnv() {
	const loadedEnv: Record<string, string | undefined> = {};
	const envFiles = envFilesForMode(normalizeMode());

	for (const filePath of envFiles) {
		mergeEnvFile(filePath, loadedEnv);
	}

	for (const [key, value] of Object.entries({ ...loadedEnv, ...process.env })) {
		if (value !== undefined) {
			process.env[key] = value;
		}
	}
}

loadEnv();

export default defineConfig({
	datasource: {
		url: env("DATABASE_URL"),
	},
	migrations: {
		path: "src/schema/migrations",
	},
	schema: "src/schema",
});
