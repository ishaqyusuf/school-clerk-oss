# School Clerk Agent Instructions

## Brain Protocol

`.brain/` is the project memory and source of truth for architecture, product state, tasks, and implementation context. Treat Brain documentation as part of the definition of done for every meaningful change.

Before starting work:

- Read the relevant Brain files for the task. Start with `.brain/BRAIN.md`, `.brain/SYSTEM_OVERVIEW.md`, `.brain/system/overview.md`, `.brain/system/architecture.md`, `.brain/engineering/ai-rules.md`, `.brain/engineering/coding-standards.md`, and `.brain/tasks/in-progress.md`.
- For feature work, also read the matching file in `.brain/features/` and any related ADR in `.brain/decisions/`.
- For API, auth, permission, database, or migration work, read the matching files under `.brain/api/` and `.brain/database/`.
- After Prisma schema/database changes, run only `bun run db:push --local` and `bun run db:push --prod`. Do not run `db:migrate`, create migration files, or push the schema to the preview profile unless the user explicitly requests it.

After code changes:

- Run a Brain documentation impact check before finishing.
- Update `.brain/database/schema.md`, `.brain/database/relationships.md`, or `.brain/database/migrations.md` for database changes.
- For Prisma database updates, run only `bun run db:push --local` and `bun run db:push --prod`. Do not run `db:migrate`, create migration files, push to the preview profile, or force destructive changes without explicit approval.
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
- Use the HTTPS URLs reported by the active shared Portless proxy for `school-clerk`, `school-clerk-dashboard`, and `school-clerk-site`; do not hardcode a proxy port in commands or links.
- Reuse the active shared proxy configuration. Do not stop or reconfigure it merely to force port-free URLs.
- Generate Prisma client with `bun run db:generate`.
- Apply Prisma schema changes with `bun run db:push --local` and `bun run db:push --prod`.
- Validate broad changes with `bun run typecheck` and the narrowest relevant build or lint command.

## Engineering Rules

- Preserve existing monorepo structure under `apps/`, `packages/`, and `tooling/`.
- Prefer existing shared packages and local patterns before adding new abstractions.
- Do not edit secrets in `.env*` files unless the user explicitly asks.
- Keep changes scoped to the requested task and avoid unrelated formatting churn.

## Vercel runtime and cost

- Keep eligible public pages static. For new request-time rendering, Proxy work, API calls, polling, or jobs, document the trigger, expected frequency, and server responsibility. Verify build output for affected public routes.
- Use Next.js `/api` for app-owned HTTP endpoints and reuse existing typed contracts. Within one deployment, reuse the same authorized query or service where it can replace a self-fetch. Record callers and runtime needs before introducing another API deployment.
- Scope Proxy work to the hosts and paths it serves, including exclusions for unrelated assets where compatible. Measure extra network calls and bound their timeouts. Preserve tenant resolution, authorization, and the dashboard's signed regional handoff for tenant requests.
- Keep session, role, tenant workspace, payment, private file, and preview data private. For shared public caches, document eligible data, keys, TTL, and invalidation. Verify isolation, unpublishing, and custom-domain reassignment where applicable.
- Bound page size, polling, retries, concurrency, and payloads. Skip retries for unrecoverable auth or validation failures. Scope any rate limits to the expensive paths while preserving expected clients, callbacks, jobs, and monitors.
- Reuse Trigger.dev for work the product can defer. Document ownership, auth, timeout, retries, and idempotency, including overlapping or duplicate runs. Keep liveness cheap and dependency readiness separate.
- Protect internal previews and verify dependency-aware build skipping when changing the workspace graph. Preserve working rollback deployments when reviewing retention. Check the effect of large dependencies and public image variants on bundles and usage.
- Record usage baselines and verification for runtime changes. Include project, environment, normalized routes, invocations, CPU per 1,000 requests, latency, and errors where available. Keep secrets and customer payloads out of telemetry.
- Before changing traffic or retiring an endpoint, inventory web and mobile versions, callbacks, jobs, and monitors. Prove equivalent behavior in preview and record a rollback path under the existing release and authorization rules.
