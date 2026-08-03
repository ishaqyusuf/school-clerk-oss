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
- Development database mode follows the shared router: default `bun run dev`
  and `bun run dev --local` use `.env.local`, `bun run dev --dev` uses hosted
  development, `bun run dev --preview` uses preview, and `bun run dev --prod`
  uses the production-env smoke profile.
- Database envs are root-only and canonicalized to `DATABASE_URL` plus
  `SCHOOL_CLERK_DB_MODE`. Root tooling loads `.env` followed by exactly one of
  `.env.local`, `.env.dev`, `.env.preview`, or `.env.production`; every profile
  file owns its complete `DATABASE_URL`. Do not add filename aliases,
  package-path scanning, cross-profile inheritance, or generated fallbacks.
- Local infrastructure must parse `.env.local` `DATABASE_URL` and derive transient Docker Compose settings from it. Missing local database configuration is an error, not a reason to synthesize a URL.
- Turbo `dev` tasks must pass through the canonical resolved database environment variables so filtered local dev commands keep package processes on the selected DB profile.
- Prisma database actions use `local-infra-kit/bin/db.ts`: `db:generate`,
  `db:migrate`, `db:pull`, `db:push`, `db:studio`, and `db:shell` default to
  local and accept only `--local`, `--dev`, `--preview`, or `--prod`. Do not add
  mode-suffixed aliases or repository-local database routers; normal schema
  rollout still uses only local and production push profiles.
- Local Postgres startup is owned by `scripts/start-dev-services.sh`; it starts Docker only when the selected DB mode or URL is local and skips local services for preview databases.
- Keep `packages/db` and `packages/jobs` scripts on the shared dev-infra resolver for development, and keep production commands on `with-root-env --mode production`.
- Current Portless local app names: dashboard -> `school-clerk-dashboard`, marketing -> `school-clerk`, school-site -> `school-clerk-site`, api -> `api`.
- Local Portless-backed scripts reuse the active shared HTTPS wildcard proxy; do not set `PORTLESS_PORT` or `PORTLESS_HTTPS` in workspace dev scripts.
- School-site local dev runs behind Portless at `school-clerk-site.localhost` with its Next app port set to `2400`.
- Website work uses the HTTPS URLs reported by the active Portless proxy for `school-clerk`, `<tenant>.school-clerk-dashboard`, and `<tenant>.school-clerk-site`.
- Reuse the active shared proxy configuration, including its selected proxy port. Do not stop or reconfigure it solely to change how the URL is displayed.
- Dashboard tenant development hosts resolve as `<tenant>.school-clerk-dashboard.localhost`; keep host parsing and cookie lookup aligned with that format.
- After every Prisma schema/database update, run only `bun run db:push --local` and `bun run db:push --prod`. Do not run `db:migrate`, create migration files, or push to the preview profile unless the user explicitly requests it.
- Internal dashboard navigation should use proxy-relative product routes such as `/finance`, `/students`, `/academic`, etc. Do not hardcode `/dashboard/...` into hrefs or router pushes, because tenant/domain proxying already handles the dashboard mount.

## Documentation Rules

- Use ADRs for architectural decisions.
- Log resolved bugs in bug memory.
- Move tasks across backlog, in-progress, and done states.
