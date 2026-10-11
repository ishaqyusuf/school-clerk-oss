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

## Production release verified — 11 October 2026

Application and release migration commit: `8ab727c84981acd9cc8f21e3f90a063856ef1466`.
Dashboard `dpl_3smuwBqdeg5GvR15WpUwS5XGTiLd` and Marketing
`dpl_8ppJFiMw21xwsfenuFpLZ3MghbqH` are READY for that exact Git SHA,
with existing production aliases assigned. Trigger project
`proj_wiixtfwfyigtsruijbqd` deployed version `20261011.1`, deployment
`kt7yktps`, with five detected tasks. The shared release exited zero and
`bun release status --production` reports nothing to release.

The initial Vercel polling call failed on temporary DNS resolution after Git
push; the unchanged shared command resumed successfully without another code
push. Component success tags are published; archive/release-assurance-v1 preserves
the old source. Database baseline stays at d6f43f0; no schema or school-record
write occurred and newer unrelated assistant database objects were preserved.

Authenticated production Chrome verification: default-checked suggestions;
first-name search produced 18 live matches; Show more displayed 10 of 18;
surname refinement ranked the one combined match above 18 partial matches;
current class and Edit action were visible. The class dialog loaded the current
class, disabled unchanged Save, and Cancel preserved draft names. Collapse left
search checked; unchecking displayed the off state even after changing a name;
rechecking restored latest-name results. No console errors were captured. No
student create, enrollment or class-change mutation was submitted. Production
screenshot: `.scratch/student-form-qa/production.jpg` in the working checkout.

Focused validation: 32 shared release-flow tests (129 assertions), 13 project
tests (42 assertions), Biome and diff checks, optimized Dashboard and Marketing
builds. Earlier desktop/mobile component QA verified mutation and error paths
with fictional transport. Full workspace typecheck retains pre-existing errors;
clean full Dashboard checking hit its memory limit. Local HTTPS full-app QA was
unavailable because cmux was closed; authenticated live suggestion-flow checks
above provide the production smoke evidence.
