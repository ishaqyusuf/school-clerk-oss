# Brain Handoff Review: Student Import Input And Name Parsing Fix 1

## Reviewed Handoff
brain/handoffs/fixes/2026-06-12-student-import-input-and-name-parsing-fix-1.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json

## Execution Path
/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-input-and-name-parsing

## Landing
Not needed; review failed and a fix handoff was created.

## Source Plan
brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md

## Result
Needs Fix

## Findings
- [P1] The submitted work fails the required clean-diff check. `git diff --check` reports `apps/dashboard/src/components/modals/student-import/index.tsx:331: new blank line at EOF.` This is in a touched file and blocks approval/landing until corrected.
- [P2] Parsed rows still do not expose a separately named effective input gender field. `apps/dashboard/src/components/modals/student-import/index.tsx:107-117` stores the effective row/global gender in `gender` and the row-level value in `parsedGender`, but the source plan/fix handoff asked parsed rows to include row gender and effective input gender explicitly. This is not as severe as the whitespace failure because the current behavior is inspectable, but the next pass should either add `effectiveInputGender` or document why `gender` is the canonical effective field.

## Acceptance Criteria Check
- The touched import files have no new TypeScript errors: Pass by review of `bun --filter @school-clerk/dashboard typecheck` output; full typecheck still fails on known unrelated baseline errors, but no touched student-import errors appeared.
- Target classroom selection is carried as a classroom department ID into the verification/import activity: Pass.
- Import activity resolves by selected classroom department ID instead of display-name matching: Pass.
- Global Gender can be unset without rendering an empty `SelectItem value=""`: Pass.
- Missing gender remains missing and is not silently converted to Female: Pass for partial-match updates; create action is disabled when gender is missing.
- Parsed rows preserve line number, original text, row gender, and selected classroom department ID: Partial; effective input gender is represented as `gender`, but not named separately.
- Existing raw text local storage behavior remains usable: Pass.

## Checks
- bun --filter @school-clerk/dashboard typecheck: Fail due to known unrelated baseline errors; no touched student-import errors observed in the output.
- git diff --check: Fail, `apps/dashboard/src/components/modals/student-import/index.tsx:331: new blank line at EOF.`
- Manual/parser review for no gender, explicit gender, aliases, multiple names, blank lines, extra whitespace, missing classroom, and selected classroom department ID flow: Partial by code inspection; no browser smoke test was run in this review wake.

## Brain Update Check
- brain/progress.md: Present.
- brain/features/student-import.md: Present.
- brain/tasks/in-progress.md: Present; task remains in progress.

## Decision
The fix addressed the original functional blockers, but the submitted diff still fails the clean-diff gate in a touched file. A narrow follow-up fix handoff was created.

## Follow-Up
- brain/handoffs/fixes/2026-06-13-student-import-input-and-name-parsing-fix-2.md
