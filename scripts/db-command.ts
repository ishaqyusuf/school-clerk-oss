#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

type DbAction = "generate" | "migrate" | "pull" | "push" | "studio";
type DbProfile = "local" | "remote" | "prod";

type DbCommandCliOptions = {
	action: DbAction;
	profile: DbProfile;
	passthrough: string[];
};

type CommandEnv = Record<string, string | undefined>;

const ACTIONS = new Set<DbAction>([
	"generate",
	"migrate",
	"pull",
	"push",
	"studio",
]);

const PROFILE_FLAGS = new Map<string, DbProfile>([
	["--local", "local"],
	["--remote", "remote"],
	["--remote-dev", "remote"],
	["--prod", "prod"],
]);

export function parseArgs(argv: string[]): DbCommandCliOptions {
	const action = argv[0] as DbAction | undefined;

	if (!action || !ACTIONS.has(action)) {
		throw new Error(
			`Missing or invalid DB action. Use one of: ${[...ACTIONS].join(", ")}.`,
		);
	}

	let profile: DbProfile = "local";
	let explicitProfile: DbProfile | undefined;
	const passthrough: string[] = [];
	let index = 1;

	while (index < argv.length) {
		const arg = argv[index];

		if (!arg) {
			break;
		}

		if (arg === "--") {
			passthrough.push(...argv.slice(index + 1));
			break;
		}

		const nextProfile = PROFILE_FLAGS.get(arg);

		if (!nextProfile) {
			throw new Error(
				`Unknown db:${action} flag: ${arg}. Use --local, --remote, --remote-dev, --prod, or -- for Prisma args.`,
			);
		}

		if (explicitProfile && explicitProfile !== nextProfile) {
			throw new Error(
				`Conflicting db:${action} flags. Choose only one DB profile.`,
			);
		}

		explicitProfile = nextProfile;
		profile = nextProfile;
		index += 1;
	}

	return { action, profile, passthrough };
}

export function prismaArgsForAction(
	action: DbAction,
	profile: DbProfile,
): string[] {
	switch (action) {
		case "generate":
			return ["prisma", "generate"];
		case "migrate":
			return profile === "prod"
				? ["prisma", "migrate", "deploy"]
				: ["prisma", "migrate", "dev"];
		case "pull":
			return ["prisma", "db", "pull"];
		case "push":
			return ["prisma", "db", "push"];
		case "studio":
			return ["prisma", "studio", "--port", "5556"];
	}
}

export function prismaCommandForOptions(
	options: DbCommandCliOptions,
): string[] {
	return [
		"bunx",
		"--bun",
		...prismaArgsForAction(options.action, options.profile),
		...options.passthrough,
	];
}

function readEnvFile(filePath: string): CommandEnv {
	if (!existsSync(filePath)) {
		return {};
	}

	return parseEnv(readFileSync(filePath, "utf8"));
}

function envFilesForProfile(
	profile: DbProfile,
	workspaceRoot: string,
): string[] {
	switch (profile) {
		case "local":
			return [resolve(workspaceRoot, ".env.local")];
		case "remote":
			return [
				resolve(workspaceRoot, ".env.local"),
				resolve(workspaceRoot, ".env.remote.local"),
			];
		case "prod": {
			const prodFile = resolve(workspaceRoot, ".env.prod");

			return existsSync(prodFile)
				? [prodFile]
				: [resolve(workspaceRoot, ".env.production")];
		}
	}
}

function loadProfileEnv(profile: DbProfile, workspaceRoot: string): CommandEnv {
	const env: CommandEnv = {};

	for (const filePath of envFilesForProfile(profile, workspaceRoot)) {
		Object.assign(env, readEnvFile(filePath));
	}

	return env;
}

function defaultLocalDatabaseUrl(env: CommandEnv) {
	return `postgresql://postgres:postgres@127.0.0.1:${env.DB_HOST_PORT ?? "55432"}/school_clerk`;
}

function databaseUrlForProfile(profile: DbProfile, env: CommandEnv) {
	switch (profile) {
		case "local":
			return (
				env.LOCAL_DATABASE_URL ??
				env.DATABASE_URL ??
				defaultLocalDatabaseUrl(env)
			);
		case "remote":
			return env.REMOTE_DEV_DATABASE_URL ?? env.DATABASE_URL;
		case "prod":
			return env.PROD_DATABASE_URL ?? env.DATABASE_URL;
	}
}

function isLocalDatabaseUrl(value: string) {
	try {
		const hostname = new URL(value).hostname;

		return ["localhost", "127.0.0.1", "::1", "0.0.0.0", "postgres"].includes(
			hostname,
		);
	} catch {
		return false;
	}
}

export function envForOptions(
	options: DbCommandCliOptions,
	workspaceRoot: string,
): CommandEnv {
	const profileEnv = loadProfileEnv(options.profile, workspaceRoot);
	const databaseUrl = databaseUrlForProfile(options.profile, profileEnv);
	const mode =
		options.profile === "prod"
			? "prod"
			: options.profile === "remote"
				? "remote"
				: "local";
	const dbMode =
		options.profile === "remote"
			? "remote-dev"
			: options.profile === "prod"
				? "prod"
				: "local";

	if (options.action !== "generate") {
		if (!databaseUrl) {
			throw new Error(
				`Missing DATABASE_URL for db:${options.action} --${mode}. Set it in ${envFilesForProfile(
					options.profile,
					workspaceRoot,
				)
					.map((filePath) => filePath.replace(`${workspaceRoot}/`, ""))
					.join(" or ")}.`,
			);
		}

		if (options.profile !== "local" && isLocalDatabaseUrl(databaseUrl)) {
			throw new Error(
				`Refusing to run db:${options.action} --${mode} with a local DATABASE_URL. Check the ${mode} env file before retrying.`,
			);
		}
	}

	return {
		...profileEnv,
		DATABASE_URL: databaseUrl,
		SCHOOL_CLERK_DB_MODE: dbMode,
	};
}

function findWorkspaceRoot(startDir: string): string {
	let currentDir = resolve(startDir);

	while (true) {
		const packageJsonPath = resolve(currentDir, "package.json");

		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
				workspaces?: unknown;
			};

			if (Array.isArray(packageJson.workspaces)) {
				return currentDir;
			}
		}

		const parentDir = resolve(currentDir, "..");

		if (parentDir === currentDir) {
			throw new Error(`Could not find a workspace root from ${startDir}.`);
		}

		currentDir = parentDir;
	}
}

async function run(
	command: string[],
	options: { cwd: string; env?: CommandEnv },
) {
	const env = { ...process.env };

	if (options.env) {
		for (const [key, value] of Object.entries(options.env)) {
			if (value !== undefined) {
				env[key] = value;
			}
		}
	}

	const child = Bun.spawn(command, {
		cwd: options.cwd,
		env,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await child.exited;

	if (exitCode !== 0) {
		process.exit(exitCode);
	}
}

async function main() {
	const options = parseArgs(Bun.argv.slice(2));
	const workspaceRoot = findWorkspaceRoot(process.cwd());
	const dbPackageDir = resolve(workspaceRoot, "packages/db");
	const withEnvPath = resolve(
		workspaceRoot,
		"../local-infra-kit/bin/with-env.ts",
	);

	if (!existsSync(dbPackageDir)) {
		throw new Error(`Could not find DB package at ${dbPackageDir}.`);
	}

	if (options.profile === "local" && options.action !== "generate") {
		if (!existsSync(withEnvPath)) {
			throw new Error(
				`Could not find local-infra-kit env wrapper at ${withEnvPath}.`,
			);
		}

		await run(
			[
				"bun",
				withEnvPath,
				"--profile",
				"school-clerk",
				"--mode",
				"local",
				"--",
				"bun",
				"run",
				"dev:services",
			],
			{
				cwd: workspaceRoot,
			},
		);
	}

	await run(prismaCommandForOptions(options), {
		cwd: dbPackageDir,
		env: envForOptions(options, workspaceRoot),
	});
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
