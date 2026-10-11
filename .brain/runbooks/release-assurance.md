# Shared release runbook

Uses EwaTrade's shared `infra release` engine through the sibling
`../local-infra-kit` checkout. Provider CLIs use the operator's existing login.

1. Prepare a clean committed candidate, preserving unrelated workspace work.
2. Test the changed behavior and inspect the exact diff.
3. For schema changes, first run `bun run db:push --local`. Production release
   subsequently uses `bun run db:push --prod`; retain target fingerprint and
   data-loss confirmations. Preview schema push is not configured.
4. Run `bun release plan --production` on main (or at a detached HEAD exactly
   matching origin/main). Check project ownership, environment drift and actions.
5. Run `bun release --production --yes` only for an authorized production release.
   The command pushes code, waits for Vercel and deploys changed jobs.
6. Verify production behavior and run `bun release status --production`.

## First migration baseline

Missing tags conservatively mean changed. `bun release mark --only <component>`
records already-released work without deployment; use it only with actual provider
or schema evidence, at the commit the evidence supports. Never mark an unknown
component to silence a release obligation. Current provider inventory confirms
Dashboard and Marketing at d6f43f0 before this release. Production database state
and jobs need independent verification or their normal guarded deployment.

## Failures

Vercel ERROR/CANCELED, missing exact-commit deployment, failed database push or
failed jobs command stops release. Successful tags remain recorded, allowing
resume. A Git push can already make READY web apps live before a later jobs
failure: report partial release explicitly. Tags are progress records, not a
substitute for application smoke tests.

The retired `.release` snapshot, evidence verifier, manifest, CI workflow and
associated tests are removed. Historical ADR-0022 remains marked superseded.
API ships with Dashboard; school-site has no hosted project in the confirmed
inventory. Preview excludes database and jobs until explicitly configured.

## Adoption evidence — 11 October 2026

Authenticated Vercel inventory confirms Dashboard and Marketing at d6f43f0.
A read-only Prisma diff from live Production to this committed schema reports
only removal of newer assistant objects/columns absent from the candidate.
All candidate schema objects already exist; student-form work changes no schema.
Record database baseline at d6f43f0 while preserving the newer live assistant
objects. Do not run a schema push from this candidate: it would roll back those
objects. Jobs have no verified adoption baseline and must deploy normally.

The jobs script resolves the installed `trigger` binary with `bunx --no-install`
instead of assuming package-local node_modules layout; Production is explicit.
No new provider dependency is installed by this release command.
