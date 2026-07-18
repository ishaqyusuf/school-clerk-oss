# ADR-0008: cmux Dev Runtime, Portless URLs, And Prisma Profile Propagation

- Status: accepted
- Date: 2026-07-18

## Context

Development servers need a stable, visible owner instead of being started in transient agent shells. Website QA depends on Portless named hosts remaining port-free. Prisma changes must be propagated consistently across the configured local, production, and remote-development database profiles.

## Decision

- Agents never start dev in their current shell.
- Reuse an already-running development stack when available.
- When dev is required and no suitable stack is running, create a new tab in the already-open cmux session and run exactly `jd school-clerk dev --local -f marketing dashboard school-site`.
- If cmux is unavailable, mark the active goal blocked instead of launching dev elsewhere.
- Website work uses port-free Portless URLs: `https://school-clerk.localhost`, `https://<tenant>.school-clerk-dashboard.localhost`, and `https://<tenant>.school-clerk-site.localhost`.
- An explicit port on a named host, such as `school-clerk.localhost:1441`, is a blocking Portless bug and must be fixed before website work proceeds.
- After every Prisma schema/database update, run the repository migration workflow, `bun run db:push --local`, `bun run db:push --prod`, and attempt `bun run db:push --remote`.
- Destructive database changes still require explicit approval and must not be forced.

## Consequences

- Dev processes remain visible and controllable in cmux.
- Agents block instead of silently starting an unmanaged dev process when cmux is unavailable.
- Browser QA and generated local website links use stable named hosts without proxy ports.
- Portless regressions are repaired at their source rather than bypassed with raw ports.
- Prisma updates are checked against every configured database profile, with unavailable or failed profiles reported explicitly.

## Alternatives Considered

- Starting dev directly in the agent shell.
- Accepting raw localhost ports or port-bearing named hosts as QA fallbacks.
- Pushing Prisma changes to only one database profile.

## Follow-up Actions

- Keep the cmux command and Portless hostnames aligned with the repository's actual workspace names and local-infra profile.
