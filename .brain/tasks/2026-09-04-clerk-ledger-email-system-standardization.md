# Task: Clerk Ledger Email System Standardization

## Status
In Progress

## Priority
High

## Created Date
2026-09-04

## Last Updated
2026-09-04

## Global Ticket
- Ticket Position: 1/1

## Source Context
[Clerk Ledger email system plan](../plans/2026-08-30-feature-clerk-ledger-email-system.md). The implementation is present in the current checkout and was previously recorded as complete, but it remains uncommitted. Revalidate the current worktree, complete code review, address findings, and commit the finished task without discarding existing changes.

## Implementation Progress
- Completion: 86%
- Current Checklist: 7/7 — Commit validated work and synchronize Brain status
- Blockers: None

## Implementation Checklist
- [x] Audit the current diff against the approved plan and preserve the intended scope.
- [x] Verify all active email flows use the shared Clerk Ledger layouts and thin delivery callers without retained raw HTML presentation.
- [x] Verify package exports, preview discovery, rendering coverage, and tenant subject contracts cover the intended message set.
- [x] Run focused email and notification tests plus their package typechecks.
- [x] Run affected application/package typechecks and classify any failures as introduced or pre-existing.
- [x] Complete the required two-axis code review and address all actionable findings.
- [ ] Commit the validated work on the current branch and synchronize Brain task status and ledgers.

## Validation Evidence
- `git diff --check` passed on 2026-09-04.
- The current diff matches the approved seven-layout Clerk Ledger package boundary, preserves existing delivery/provider routing, and retains the 15-message rendered HTML and desktop/mobile screenshot catalog.
- Corrected the notification delivery rule to distinguish email-channel registrations from the intentional in-app-only `signup_success` type.
- Traced auth, dashboard signup, school-site admission, API enrollment, notification-service, and jobs delivery paths; each renders a shared `@school-clerk/email` layout and retains only delivery/routing responsibilities.
- Repository search found no retained app-owned document/body email templates; the only delivery-boundary HTML fragment is the existing QA-routing recipient banner.
- Confirmed all seven layouts are exported and expose React Email preview defaults; the catalog renders all 15 active email messages; render coverage exercises seven layouts plus admission's no-payment branch; subject-contract coverage spans finance, assessment, and staff invitation flows.
- `bun --cwd packages/email test` passed after review fixes: 9 tests, 52 assertions.
- `bun --cwd packages/notifications test` passed: 3 tests, 3 assertions.
- `bun run --cwd packages/email typecheck`, `bun run --cwd packages/notifications typecheck`, and `bun run --cwd packages/email lint` passed.
- `bun run --cwd packages/auth typecheck` and `bun run --cwd apps/school-site typecheck` passed.
- `bun run --cwd apps/api typecheck` reached only the two established academic-term reset/setup errors recorded by the source plan; neither touches this task's email paths.
- `bun run --cwd apps/dashboard typecheck` reached the established `ErrorComponent` incompatibilities plus two unrelated pre-existing undeclared Radix imports in `menu.tsx` and `types.ts`; the touched signup action passed Biome.
- `bun run --cwd packages/jobs typecheck` and root `bun run typecheck` remain blocked by the established database export, NodeNext module-resolution, and shared strictness cascade; the root run completed 13 package checks before Jobs stopped Turbo.
- Biome passed all 13 touched auth, dashboard, notification-type, test, and catalog source files. A broader notification-type lint also exposed pre-existing tab-format drift in untouched `registry.ts` and `signup-success.ts`, which is outside this change.
- Two-axis review found missing rendered CTA padding, invalid shared footer destinations, stale evidence wording, and an incompatible React Email preview dependency set. Added inline `13px 19px` CTA padding, removed the unsafe generic footer links, added render regressions for both, corrected the evidence, and aligned `react-email`/`@react-email/ui` at `6.9.3`.
- Post-fix validation passes: 9 email tests with 52 assertions, 3 notification subject tests, both package typechecks, email lint, and a fresh 15-message catalog with no invalid legacy/local footer origins or undefined values.
- `bun run --cwd packages/email build` now passes dependency installation and reaches Next.js 16.3 production compilation; the generated preview UI then stops on its external Google Fonts fetch because this build runner cannot reach `fonts.googleapis.com`.
- Historical visual evidence remains valid for the approved direction. Current-worktree rendered-HTML assertions cover the final CTA/footer fixes, but refreshed screenshots are pending because both the browser-skill initializer and local-file navigation were rejected by the active automation policies.
- Final standards and specification re-review found no remaining actionable task-introduced findings.
