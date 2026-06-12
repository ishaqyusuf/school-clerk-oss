# Brain Fix Handoff: Admin Empty Classroom Report Spreadsheet Print Verification Fix 2

## Status
Ready

## Source Review
brain/reviews/2026-06-12-admin-empty-classroom-report-spreadsheet-print-review-v2.md

## Original Handoff
brain/handoffs/ready/2026-06-12-admin-empty-classroom-report-spreadsheet-print-handoff.md

## Previous Fix Handoff
brain/handoffs/fixes/2026-06-12-admin-empty-classroom-report-spreadsheet-print-fix-1.md

## Source Plan
brain/plans/2026-06-12-feature-admin-empty-classroom-report-spreadsheet-print.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-empty-report-spreadsheet-print.json

## Goal
Close the final review blockers only: align the role-gate documentation with implementation, and provide real browser/print verification evidence or clearly block the queue item instead of submitting it as complete.

## Fix Items
1. Update `brain/api/permissions.md` so it matches the implemented gate: blank manual classroom report sheet print is available to `ADMIN` SaaS owners and title-case `Admin` staff admins, unless product chooses a narrower rule and code is changed to match.
2. Run live browser/print verification on a stable dev server with test data, covering:
   - admin can see and open "Print Empty Sheet";
   - generated empty print has student names and subject/assessment columns;
   - score cells, subject totals, grand total, and percentage are blank when saved scores exist;
   - existing filled "Print Spreadsheet" still prints scores;
   - teacher/non-admin cannot see the empty print action;
   - wide assessment sheet is printable without header/table overlap.
3. If the dev server or data setup is still unavailable, do not mark this complete. Update the queue item to `blocked` with a clear blocker and leave enough evidence for the user to fix the environment.

## Context To Read First
- brain/reviews/2026-06-12-admin-empty-classroom-report-spreadsheet-print-review-v2.md
- brain/handoffs/fixes/2026-06-12-admin-empty-classroom-report-spreadsheet-print-fix-1.md
- brain/handoffs/ready/2026-06-12-admin-empty-classroom-report-spreadsheet-print-handoff.md
- apps/dashboard/src/components/classroom-result-table.tsx
- brain/api/permissions.md
- brain/progress.md

## Acceptance Criteria
- Permission docs and `classroom-result-table.tsx` role gate agree.
- Completion notes include actual browser/print verification results, with route/account role used and Pass/Fail for each required case.
- If verification fails, the issue is fixed before resubmission.
- If verification cannot run, queue status is `blocked`, not `submitted`.
- `git diff --check` passes.
- `bun --filter @school-clerk/dashboard typecheck` is rerun and any failures are classified as baseline vs changed-file.

## Do Not Change
- Do not broaden report-sheet scope beyond docs alignment and verification fixes.
- Do not move the task to done.
- Do not alter unrelated staff report sheet work.
- Do not add persistent print logs.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- `git diff --check`
- Browser/print verification listed above

## Brain Update Contract
- Update `brain/progress.md` with verification results or blocker details.
- Update `brain/api/permissions.md` to match the final role gate.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes
Fill this in after verification/fix:

- Changed files:
- Checks run:
- Browser/print verification:
  - Admin empty print:
  - Blank cells with existing scores:
  - Filled print unchanged:
  - Teacher/non-admin hidden:
  - Wide sheet layout:
- Brain docs updated:
- Unresolved issues:
