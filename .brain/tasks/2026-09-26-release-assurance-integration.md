# School Clerk release assurance integration

## Status

Done locally — hosted activation pending.

## Delivered

- Pinned shared release-only toolkit snapshot and checksum lock.
- Six-target Preview/Production manifest with no mobile target.
- Advisory local plan/status commands and a fail-closed signed-evidence check.
- Protected verification-only workflow for pull requests and `main`.
- Focused manifest, database ordering, signed-evidence, Preview waiver, and
  Production verification tests.
- Feature, ADR, architecture, coding-standard, and operator documentation.

## Validation

- `bun test scripts/release-assurance.test.ts`
- Scoped strict TypeScript for the integration files
- Scoped Biome formatting/checks
- GitHub workflow YAML parsing
- Preview and Production `release:status`
- Missing-key fail-closed `release:check`
- Scoped diff hygiene

No database push, Vercel deployment or promotion, Trigger deployment, provider
setting, secret, or GitHub repository setting changed during source integration.
