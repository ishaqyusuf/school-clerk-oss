# ADR-0008: cmux Dev Runtime, Portless URLs, And Prisma Profile Propagation

- Status: accepted, with Prisma propagation superseded by ADR-0012
- Date: 2026-07-18

## Context

Development servers need a stable, visible owner instead of being started in transient agent shells. Website QA depends on Portless named hosts remaining port-free. The original decision also covered Prisma propagation; ADR-0012 now owns that operational policy.

## Decision

- Agents never start dev in their current shell.
- Reuse an already-running development stack when available.
- When dev is required and no suitable stack is running, create a new tab in the already-open cmux session and run exactly `jd school-clerk dev --local -f marketing dashboard school-site`.
- If cmux is unavailable, mark the active goal blocked instead of launching dev elsewhere.
- Website work uses port-free Portless URLs: `https://school-clerk.localhost`, `https://<tenant>.school-clerk-dashboard.localhost`, and `https://<tenant>.school-clerk-site.localhost`.
- An explicit port on a named host, such as `school-clerk.localhost:1441`, is a blocking Portless bug and must be fixed before website work proceeds.
- Superseded by ADR-0012: the original decision required the repository migration workflow plus local, production, and remote-development propagation.
- Destructive database changes still require explicit approval and must not be forced.

## Consequences

- Dev processes remain visible and controllable in cmux.
- Agents block instead of silently starting an unmanaged dev process when cmux is unavailable.
- Browser QA and generated local website links use stable named hosts without proxy ports.
- Portless regressions are repaired at their source rather than bypassed with raw ports.
- Prisma propagation follows ADR-0012.

## Alternatives Considered

- Starting dev directly in the agent shell.
- Accepting raw localhost ports or port-bearing named hosts as QA fallbacks.
- Pushing Prisma changes to only one database profile.

## Follow-up Actions

- Keep the cmux command and Portless hostnames aligned with the repository's actual workspace names and local-infra profile.
