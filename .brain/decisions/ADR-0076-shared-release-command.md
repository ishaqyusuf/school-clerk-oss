# ADR-0076: Use EwaTrade's shared release command

## Status

Accepted, 11 October 2026. Owner explicitly requested exact release-flow parity
with EwaTrade and the production release of student-form suggestions.

## Decision

Replace School Clerk's pinned release-assurance snapshot and signed-evidence CI
with the exact shared `bun --env-file=/dev/null ../local-infra-kit/bin/infra.ts
release` entrypoint used by EwaTrade. Keep orchestration, provider checks, Git
locks, environment audits, component tags and resume behavior in the shared
engine; do not copy or fork them into School Clerk. Retire the old manifest,
adapters, snapshot, workflow and tests, retaining their history in Git.

Configure School Clerk's actual production surfaces: database, Dashboard,
Marketing and Trigger jobs. Dashboard owns its embedded tRPC API via workspace
closure. API and school-site standalone projects were not found in the hosted
team; no invented mappings or implicit new project provisioning are added.

Project-specific rules take precedence over copying EwaTrade's component list:
no Expo surface exists here, no Preview database push is authorized, and jobs
currently have only a production deploy command. Keep database/jobs production
only. Schema rollout retains local verification, production target confirmation
and Prisma's data-loss guard. Environment audit ignores must document their
actual tooling, fallback or optional behavior.

## Consequences

School Clerk now uses EwaTrade's current mechanism, not its retired signing
system. Release authority is the owner's authorization plus the existing
provider CLI login and production safeguards. A clean scoped candidate excludes
unrelated uncommitted assistant, schema and dependency changes. Missing component
tags require verified adoption baselines or the normal component deployment.
Production readiness still requires testing and post-deploy smoke evidence.
