# AI Rules

## Purpose

Operational rules for AI agents contributing to this repository.

## How To Use

- Review before AI-assisted coding sessions.
- Keep in sync with team standards.
- Prioritize safety and maintainability.

## Template

## Core Rules

- Read relevant `.brain/` docs before changes.
- Keep Wayfinder maps, Wayfinder tickets, and scratch artifacts from Matt Pocock-style planning skills under `.scratch/`, not under `.brain/`. Brain should record durable project knowledge and final documentation updates, while scratch skill work stays in the scratch folder.
- Preserve existing behavior unless change is requested.
- Keep diffs focused and minimal.
- Update docs alongside code changes.
- Never start a development server in the agent's current shell. Reuse an already-running development stack when available.
- If development runtime is required and is not already running, create a new tab in the already-open cmux session and run exactly `jd school-clerk dev --local -f marketing dashboard school-site`. If cmux is unavailable, mark the active goal blocked instead of starting dev elsewhere.
- The existing `portless`-wrapped `dev` scripts remain the implementation behind the cmux workflow; do not introduce new hardcoded default ports unless explicitly required.
- Development database mode follows the project dev router in `scripts/dev.ts`: default `bun run dev` and `bun run dev --local` use local Docker Postgres, `bun run dev --remote-dev` uses remote development, `bun run dev --prod` uses the production-env smoke profile, and `--filter`/`--f`/`-f`/`-filter` accepts Turbo-style selectors plus exact bare package-name shorthand such as `api marketing! @school-clerk/jobs`.
- Database envs are root-only and canonicalized to `DATABASE_URL`, `LOCAL_DATABASE_URL`, `REMOTE_DEV_DATABASE_URL`, `PROD_DATABASE_URL`, and `SCHOOL_CLERK_DB_MODE`; do not add new `POSTGRES_URL`/`DIRECT_URL` aliases unless a provider explicitly requires them.
- `scripts/with-root-env.mjs --mode local` and `scripts/with-dev-infra.ts` must resolve package dev scripts to the selected database profile by exporting `DATABASE_URL`, preferring `LOCAL_DATABASE_URL` for local Docker before falling back to `127.0.0.1:55432/school_clerk`.
- Turbo `dev` tasks must pass through the canonical resolved database environment variables so filtered local dev commands keep package processes on the selected DB profile.
- Prisma maintenance commands are profile-routed: `bun run db:push --local|--remote|--prod` uses `scripts/db-push.ts`; generate/pull/studio use `scripts/db-command.ts`. Normal schema rollout uses only the local and production push profiles.
- Local Postgres startup is owned by `scripts/start-dev-services.sh`; it starts Docker only when the selected DB mode or URL is local and skips local services for remote development DBs.
- Keep `packages/db` and `packages/jobs` scripts on the shared dev-infra resolver for development, and keep production commands on `with-root-env --mode production`.
- Current Portless local app names: dashboard -> `school-clerk-dashboard`, marketing -> `school-clerk`, school-site -> `school-clerk-site`, api -> `api`.
- Local Portless-backed scripts bind the shared HTTPS proxy through `SCHOOL_CLERK_PORTLESS_PROXY_PORT`, defaulting to standard port `443`; do not force `PORTLESS_HTTPS=0` or a visible development proxy port such as `1355`.
- School-site local dev runs behind Portless at `school-clerk-site.localhost` with its Next app port set to `2400`.
- Website work uses port-free Portless URLs: `https://school-clerk.localhost`, `https://<tenant>.school-clerk-dashboard.localhost`, and `https://<tenant>.school-clerk-site.localhost`.
- Treat any named Portless host that gains an explicit port, such as `school-clerk.localhost:1441`, as a blocking bug. Diagnose and fix the Portless setup before proceeding with website work.
- Dashboard tenant development hosts resolve as `<tenant>.school-clerk-dashboard.localhost`; keep host parsing and cookie lookup aligned with that format.
- After every Prisma schema/database update, run only `bun run db:push --local` and `bun run db:push --prod`. Do not run `db:migrate`, create migration files, or push to the remote-development profile unless the user explicitly requests it.
- Internal dashboard navigation should use proxy-relative product routes such as `/finance`, `/students`, `/academic`, etc. Do not hardcode `/dashboard/...` into hrefs or router pushes, because tenant/domain proxying already handles the dashboard mount.

## Documentation Rules

- Use ADRs for architectural decisions.
- Log resolved bugs in bug memory.
- Move tasks across backlog, in-progress, and done states.
