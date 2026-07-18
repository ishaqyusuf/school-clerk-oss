# Build Assessment Workbooks Implementation Handoff

Labels: `wayfinder:task`
Status: Resolved
Blocked by: [Define Verification And Rollout Matrix](define-verification-and-rollout-matrix.md)
Blocks: None

## Question

How should all resolved Assessment Workbook decisions be assembled into one implementation sequence that another agent can execute without reopening product or architecture questions?

## Context

The handoff is the destination of this Wayfinder map. It must link rather than duplicate ticket resolutions, preserve the confirmed scope, account for the user's currently dirty assessment/RTL files, and sequence package, API, database, dashboard, tests, migration, and Brain work safely.

## Resolve

- Gather all closed ticket resolutions and linked assets.
- Identify exact files/packages to create or change and any user-owned dirty files requiring careful merge.
- Sequence shared contracts, server workbook engine, API/persistence, dashboard UI, tests, fixtures, and rollout.
- State migration requirements without manually inventing migration files.
- Define incremental verification and rollback checkpoints.
- Include required Brain feature, API, permission, database, ADR, and task updates.
- Confirm every accepted product rule and out-of-scope boundary is represented.

## Expected Answer

A single implementation handoff with ordered phases, file boundaries, dependencies, acceptance criteria, commands, migration workflow, documentation impact, rollout gates, and no unresolved decisions.

## Comments

Build the final handoff as linked implementation phases: shared workbook contracts, server generation/signing, server parsing/verification, persistence and atomic apply, download builder, upload review/resolution UI, fixtures/tests, and staged rollout. Include exact file boundaries, migration commands, incremental verification gates, required Brain updates, and a pre-edit check for the user’s existing assessment/RTL changes. The handoff should explicitly confirm every map constraint and contain no unresolved product decisions.

## Resolution

Implementation is linked from the map and documented in `.brain/features/assessment-workbook-round-trip.md` plus `ADR-0010`. The focused package, API service/routes, Prisma audit models, toolbar workflow, fixtures/tests, database notes, and Brain contract updates now form the executable handoff.
