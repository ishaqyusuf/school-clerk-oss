#!/usr/bin/env bun

type DatabaseProfile = "local" | "remote-dev" | "prod";

type DbPushCliOptions = {
  profile: DatabaseProfile;
};

const PROFILE_FLAGS = new Map<string, DatabaseProfile>([
  ["--local", "local"],
  ["--remote", "remote-dev"],
  ["--remote-dev", "remote-dev"],
  ["--prod", "prod"],
]);

export function parseArgs(argv: string[]): DbPushCliOptions {
  let profile: DatabaseProfile = "local";
  let explicitProfile: DatabaseProfile | undefined;
  let index = 0;

  while (index < argv.length) {
    const arg = argv[index];

    if (!arg) {
      break;
    }

    const nextProfile = PROFILE_FLAGS.get(arg);

    if (!nextProfile) {
      throw new Error(
        `Unknown db:push flag: ${arg}. Use --local, --remote, --remote-dev, or --prod.`,
      );
    }

    if (explicitProfile && explicitProfile !== nextProfile) {
      throw new Error(
        `Conflicting db:push flags: --${explicitProfile} and --${nextProfile}. Choose one profile.`,
      );
    }

    explicitProfile = nextProfile;
    profile = nextProfile;
    index += 1;
  }

  return { profile };
}

export function commandForProfile(profile: DatabaseProfile): string[] {
  switch (profile) {
    case "local":
      return [
        "bun",
        "scripts/db-command.ts",
        "push",
        "--local",
      ];
    case "remote-dev":
      return [
        "bun",
        "scripts/db-command.ts",
        "push",
        "--remote",
      ];
    case "prod":
      return [
        "bun",
        "scripts/db-command.ts",
        "push",
        "--prod",
      ];
  }
}

async function run(command: string[]) {
  const child = Bun.spawn(command, {
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

  await run(commandForProfile(options.profile));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
