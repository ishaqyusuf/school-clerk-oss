# ADR-0022: Release assurance source integration

## Status

Accepted for source integration; hosted activation pending.

## Context

School Clerk has Prisma on Neon, four deployable web source surfaces
(`apps/dashboard`, `apps/marketing`, `apps/school-site`, and `apps/api`),
and Trigger jobs. The dashboard Vercel link is confirmed locally. Local
`.env.preview` and `.env.production` declare distinct database URL identities,
but hosted wiring remains unverified. The other Vercel project identities are
not confirmed, and `.env.preview` has no Trigger project ID. Existing jobs
deployment runs against Production. This repository
has no existing GitHub workflow for release verification.

## Decision

Commit a release-only snapshot of `local-infra-kit` at revision
`ec653d87eb0b65bbac9235680d85eed6fdfd20a1`. Keep School Clerk's
manifest, CLI, signed evidence adapter, and CI caller local to this repo.
The caller is verification-only and uses protected `preview` and `production`
GitHub environments. Missing project mappings, signed provider evidence,
current live state, or Preview jobs isolation/waiver fail the gate.

Schema changes propagate to every web and jobs target. Web and jobs releases
depend on database proof. Production Vercel verification requires a promotion
hold for a release with a database action. No hosted write is implicit.

## Consequences

Local plan/status are advisory until trusted provider baselines exist. The
signed evidence envelope must come from an authenticated, protected collector
that observes provider metadata and active state; its signing key is never
stored in the repository. Production activation needs Vercel promotion and
GitHub protection settings configured separately. The CI workflow does not
deploy or push a database schema.
