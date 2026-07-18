# School Clerk Agent Instructions

## Brain Protocol

`.brain/` is the project memory and source of truth for architecture, product state, tasks, and implementation context. Treat Brain documentation as part of the definition of done for every meaningful change.

Before starting work:

- Read the relevant Brain files for the task. Start with `.brain/BRAIN.md`, `.brain/SYSTEM_OVERVIEW.md`, `.brain/system/overview.md`, `.brain/system/architecture.md`, `.brain/engineering/ai-rules.md`, `.brain/engineering/coding-standards.md`, and `.brain/tasks/in-progress.md`.
- For feature work, also read the matching file in `.brain/features/` and any related ADR in `.brain/decisions/`.
- For API, auth, permission, database, or migration work, read the matching files under `.brain/api/` and `.brain/database/`.
- If the repository root defines both `db:migrate` and `db:push` scripts and Prisma schema/database files are changed, run `bun db:migrate`, `bun run db:push --local`, `bun run db:push --prod`, and attempt `bun run db:push --remote` after the Prisma update. Do not manually create migration files.

After code changes: 

- Run a Brain documentation impact check before finishing.
- Update `.brain/database/schema.md`, `.brain/database/relationships.md`, or `.brain/database/migrations.md` for database changes.
- For Prisma database updates, if root scripts `db:migrate` and `db:push` exist, run `bun db:migrate`, `bun run db:push --local`, `bun run db:push --prod`, and attempt `bun run db:push --remote` after changing the schema. Do not manually create migration files or force destructive changes without explicit approval.
- Update `.brain/api/endpoints.md`, `.brain/api/contracts.md`, or `.brain/api/permissions.md` for API, contract, auth, or permission changes.
- Update or create `.brain/features/<feature>.md` for feature behavior changes.
- Add an ADR under `.brain/decisions/` for durable architecture, product, integration, or implementation decisions.
- Update `.brain/tasks/backlog.md`, `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, or `.brain/tasks/roadmap.md` when task state changes.
- If no Brain update is needed, state that explicitly in the final response with the reason.

Final responses must include the Brain files updated, or `No Brain documentation updates required` with a short rationale.

## Project Commands

- Package manager: `bun`.
- Never start a development server in the agent's current shell. Reuse an already-running stack when available.
- If dev is required and no suitable stack is running, create a new tab in the already-open cmux session and run exactly `jd school-clerk dev --local -f marketing dashboard school-site`. If cmux is unavailable, mark the active goal blocked instead of starting dev elsewhere.
- Use port-free Portless website URLs: `https://school-clerk.localhost`, `https://<tenant>.school-clerk-dashboard.localhost`, and `https://<tenant>.school-clerk-site.localhost`.
- Treat any named Portless host with an explicit port as a blocking bug. Fix and reverify the port-free URL before proceeding.
- Generate Prisma client with `bun run db:generate`.
- Run migrations with `bun run db:migrate`.
- Validate broad changes with `bun run typecheck` and the narrowest relevant build or lint command.

## Engineering Rules

- Preserve existing monorepo structure under `apps/`, `packages/`, and `tooling/`.
- Prefer existing shared packages and local patterns before adding new abstractions.
- Do not edit secrets in `.env*` files unless the user explicitly asks.
- Keep changes scoped to the requested task and avoid unrelated formatting churn.
