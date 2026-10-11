# Shared release command

School Clerk uses the same `bun release` entrypoint and shared
`local-infra-kit/src/release-flow` implementation as EwaTrade. The owner requested
migration and production release on 11 October 2026. This supersedes the signed
provider-evidence system in ADR-0022; historical source remains in Git.

## Behavior

- `bun release` infers Production on main and Preview on other branches.
- `bun release plan --production` resolves providers and prints a dry run.
- `bun release status --production` reports changed components.
- `bun release env --production` audits provider environment variable names.
- The shared engine requires committed, clean production source; checks remote
  ancestry; uses a lock per environment; pushes Git only after before-push steps;
  and waits for Vercel READY at the exact commit, project, environment and branch.
- Successful components advance `release/<environment>/<component>` Git tags.
  A failed component stops the release; subsequent runs resume unfinished parts.
- Environment audits follow EwaTrade's shared implementation: they report drift.
  Do not interpret an empty/missing setting report as proof of runtime health.

## School Clerk targets

`release.config.ts` defines database, dashboard (`schoolclerk-dashboard`),
marketing (`schoolify`) and production Trigger jobs. Vercel project roots and
Git repository ownership were confirmed through authenticated inventory.
The dashboard includes `apps/api` through the workspace dependency closure and
serves tRPC at `/api/trpc`. There is no separately hosted API or school-site
project in the current team inventory. Do not fabricate a successful release of
these undeployed standalone source surfaces or map them to unrelated projects.
School Clerk currently has no configured Expo release surface.

## Database and jobs policy

Database changes use only `bun run db:push --local` and `bun run db:push --prod`.
The release config includes the production database command before Git push;
local verification must precede it. Database is excluded from Preview to respect
the owner's prohibition on preview pushes. No migration files or destructive
force flags are introduced. Shared database target-fingerprint and Prisma
confirmation safeguards remain active.

Jobs use the existing production deploy command. Preview is excluded because no
isolated Preview worker is configured. This exclusion never sends Preview work
to Production. Add isolated targets only after provisioning and authorization.

See [runbook](../runbooks/release-assurance.md) and
[ADR-0076](../decisions/ADR-0076-shared-release-command.md).
