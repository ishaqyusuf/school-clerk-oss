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
- Prefer the existing `portless`-wrapped `dev` scripts for local app startup; do not introduce new hardcoded default ports unless explicitly required.
- Development database mode follows the project dev router in `scripts/dev.ts`: default `bun run dev` and `bun run dev --local` use local Docker Postgres, `bun run dev --remote-dev` uses remote development, `bun run dev --prod` uses the production-env smoke profile, and `--filter`/`--f`/`-f`/`-filter` accepts Turbo-style selectors plus exact bare package-name shorthand such as `api marketing! @school-clerk/jobs`.
- Database envs are root-only and canonicalized to `DATABASE_URL`, `LOCAL_DATABASE_URL`, `REMOTE_DEV_DATABASE_URL`, `PROD_DATABASE_URL`, and `SCHOOL_CLERK_DB_MODE`; do not add new `POSTGRES_URL`/`DIRECT_URL` aliases unless a provider explicitly requires them.
- `scripts/with-root-env.mjs --mode local` and `scripts/with-dev-infra.ts` must resolve package dev scripts to the selected database profile by exporting `DATABASE_URL`, preferring `LOCAL_DATABASE_URL` for local Docker before falling back to `127.0.0.1:55432/school_clerk`.
- Turbo `dev` tasks must pass through the canonical resolved database environment variables so filtered local dev commands keep package processes on the selected DB profile.
- Prisma maintenance commands are profile-routed: `bun run db:push --local|--remote|--prod` uses `scripts/db-push.ts`; migrate/generate/pull/studio use `scripts/db-command.ts`. Production migrate uses `prisma migrate deploy`; local and remote-dev migrate use `prisma migrate dev`.
- Local Postgres startup is owned by `scripts/start-dev-services.sh`; it starts Docker only when the selected DB mode or URL is local and skips local services for remote development DBs.
- Keep `packages/db` and `packages/jobs` scripts on the shared dev-infra resolver for development, and keep production commands on `with-root-env --mode production`.
- Current Portless local app names: dashboard -> `school-clerk-dashboard`, marketing -> `school-clerk`, school-site -> `school-clerk-site`, api -> `api`.
- School-site local dev runs behind Portless at `school-clerk-site.localhost` with its Next app port set to `2400`.
- The root `dev:websites` / `websites` workflow runs dashboard, `@school-clerk/marketing`, `@school-clerk/school-site`, and jobs together for website work.
- Dashboard tenant development hosts resolve as `<tenant>.school-clerk-dashboard.localhost`; keep host parsing and cookie lookup aligned with that format.
- Internal dashboard navigation should use proxy-relative product routes such as `/finance`, `/students`, `/academic`, etc. Do not hardcode `/dashboard/...` into hrefs or router pushes, because tenant/domain proxying already handles the dashboard mount.

## Documentation Rules

- Use ADRs for architectural decisions.
- Log resolved bugs in bug memory.
- Move tasks across backlog, in-progress, and done states.
