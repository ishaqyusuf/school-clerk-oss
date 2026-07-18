# ADR-0012: Local And Production Prisma Push Only

- Status: Accepted
- Date: 2026-07-18

## Context

SchoolClerk's normal Prisma schema rollout previously required migration commands and schema propagation across local, remote-development, and production profiles. The project owner has simplified this operational contract.

## Decision

- After a Prisma schema change, run only `bun run db:push --local` and `bun run db:push --prod`.
- Do not run `db:migrate` or create migration files unless the project owner explicitly requests it.
- Do not push schema changes to the remote-development profile unless the project owner explicitly requests it.
- Keep destructive-change protection in force for both required pushes.

This decision supersedes the Prisma profile propagation requirements in ADR-0008 and all earlier operational notes. Historical migration log entries remain unchanged because they describe what happened at the time.

## Consequences

- Local and production schemas remain the two required deployment targets.
- Normal feature delivery no longer waits for the remote-development database.
- Schema history is represented by the Prisma schema, Brain migration log, and version control rather than generated migration files.
