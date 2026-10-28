# School Clerk typecheck repair — 28 October 2026

## Result

The workspace TypeScript baseline is repaired. All 21 typecheck tasks and all
three production Next.js builds pass. Dashboard and Marketing no longer set
typescript.ignoreBuildErrors; each build performs its own TypeScript validation.

The repository-wide lint gate still fails on pre-existing tooling and
source/dependency debt. This receipt does not claim that every repository gate
is green. The owner has been asked whether to include that broader cleanup.

## Changes and causes

- Align Dashboard/Events React declarations with the existing shared React
  19.2.18 declarations and React DOM 19.2.2, eliminating duplicate type identities.
  Runtime React versions are unchanged; the lock removes the redundant types.
- Enable School-site strict null checking so Zod required fields retain their
  requiredness. Dashboard/Marketing retain their original compiler strictness.
  No source exclusions, type ignores, any casts or validation skips were added.
- Capture validated school/session/term identifiers before async closures, use
  the configured database transaction type (including Prisma extensions), and
  type empty domain result arrays explicitly.
- Narrow unknown auth request bodies with the existing Zod validators. Explicit
  field-schema projections retain required output properties when shared API
  source is compiled by consumers with strict null checking disabled.
- Derive UI callback/preview contracts from actual inputs and outputs, use a
  callable fetch dependency, restore the missing promotion warning import, and
  remove obsolete test-import error suppressions. No visual layout change.
- Repair six in-memory test fixture files to supply current account/session,
  module and academic-term context. Preserve forbidden-role, teacher-scope,
  finance integrity and transaction assertions. Fully entitled test data is
  limited to tests of behavior inside an authorized school.

## Verification

- NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck --continue --concurrency=1:
  21/21 workspace tasks pass.
- All 101 tracked *.test.ts / *.test.tsx files run in separate Bun processes:
  **643 passed, 0 failed, 1 skipped**. Process isolation prevents global module
  mocks leaking between unrelated suites. The existing opt-in assistant database
  integration test remains skipped (ASSISTANT_DB_TEST=0).
- Production bun --env-file=/dev/null next build --turbopack from each of
  apps/school-site, apps/marketing, apps/dashboard: all pass compilation,
  TypeScript checking, prerendering and optimization. Builds use placeholder
  secrets, a non-listening loopback database URL and no provider credentials.
- bun install --frozen-lockfile --ignore-scripts --linker isolated: passes,
  2301 installs checked / 2623 packages, no dependency changes.
- git diff --check: passes.
- Generated Next declaration import changes are restored only when matching the
  expected build-produced path substitution; shared dev services are untouched.

Logs are local under /private/tmp/school-clerk-repair-*; test summaries are in
/private/tmp/school-clerk-repair-tests-final.json.

To reproduce the isolated test pass, enumerate tracked test files with
git ls-files '*.test.ts' '*.test.tsx' and invoke
bun --env-file=/dev/null test ./<file> once per file, using NODE_ENV=test,
ASSISTANT_DB_TEST=0, and a non-listening local placeholder DATABASE_URL.
The recorded run uses two concurrent subprocesses and a fresh environment
containing only PATH/HOME/TMPDIR/LANG plus those test values.

## Remaining repository gates

- bun run lint fails before source analysis: root forwards ESLint-only flags
  (--quiet, --cache, --cache-location) to TypeScript and Biome tasks.
- Dashboard still calls the removed next lint; Marketing uses legacy
  FlatCompat with Next's flat configuration; School-site has no ESLint config.
- A direct UI Biome probe reports 478 errors over 156 files (formatting, imports
  and existing recommended-rule violations). No bulk formatting, unsafe fixes,
  disabled rules or historical baselines were introduced to turn the gate green.
- manypkg check reports version-range mismatches and unsorted manifests,
  including intentional Zod 3/4 and widget major-version splits. Blind manypkg
  fix would change runtime majors; it was not used.

These gates remain visibly red and require a broader lint/dependency cleanup.
They are not typecheck/build failures or production runtime acceptance.

## Boundaries and documentation impact

No Prisma schema change, migration, database/provider write, push, deployment,
shared-server restart or visual redesign. UI/browser testing is not applicable
to the type annotations, declaration alignment and fixture repair; existing
component tests and builds are the source-level UI checks.

School and role authority still comes from the existing live context helpers.
Missing school context now fails explicitly before subject/classroom writes;
valid tenant behavior and request shapes are unchanged. No entitlement is
granted by the production changes. Module fixture data is in-memory test-only.

Brain records: .brain/qa/2026-10-28-workspace-typecheck-repair.md,
.brain/tasks/2026-09-07-workspace-typecheck-baseline.md,
.brain/tasks/2026-10-28-workspace-lint-baseline.md, .brain/tasks/in-progress.md,
.brain/tasks/done.md, .brain/BRAIN.md, .brain/api/contracts.md,
.brain/api/permissions.md, and ADR-0089. Brain is locally ignored by policy;
this tracked receipt preserves the verification evidence.
