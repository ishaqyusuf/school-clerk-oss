# Brain Fix Handoff: Student Import Input And Name Parsing Fix 2

## Status
Ready

## Source Review
brain/reviews/2026-06-13-student-import-input-and-name-parsing-review-v2.md

## Original Handoff
brain/handoffs/fixes/2026-06-12-student-import-input-and-name-parsing-fix-1.md

## Source Plan
brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json

## Goal
Fix only the remaining review blockers for the student import input/name parsing task.

## Fix Items
1. Remove the trailing blank line at EOF in `apps/dashboard/src/components/modals/student-import/index.tsx` so `git diff --check` passes.
2. Either add a clearly named `effectiveInputGender` field to parsed rows and downstream activity schema, or document in `brain/features/student-import.md` and completion notes that `student.gender` is the canonical effective input gender field while `parsedGender` is the row-level gender.
3. Re-run the required checks and report whether any remaining typecheck failures are baseline-only.

## Context To Read First
- brain/reviews/2026-06-13-student-import-input-and-name-parsing-review-v2.md
- brain/handoffs/fixes/2026-06-12-student-import-input-and-name-parsing-fix-1.md
- brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md
- apps/dashboard/src/components/modals/student-import/index.tsx
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- brain/features/student-import.md
- brain/progress.md

## Acceptance Criteria
- `git diff --check` passes.
- No new touched-file TypeScript errors are introduced.
- Parsed-row gender provenance is explicit either in code shape or Brain docs/completion notes.
- Classroom department ID flow and missing-gender handling from Fix 1 remain intact.

## Do Not Change
- Do not broaden into verification service, execution, fuzzy matching, or batch import work.
- Do not move the task to done.
- Do not rewrite unrelated UI.

## Required Checks
- git diff --check
- bun --filter @school-clerk/dashboard typecheck and report whether failures are baseline-only or touched-file errors.

## Brain Update Contract
- Update `brain/progress.md` with fix completion notes.
- Update `brain/features/student-import.md` only if clarifying the effective gender field contract.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes
Fill this in after implementation:

- Changed files:
  - `apps/dashboard/src/components/modals/student-import/index.tsx` (removed blank line)
  - `brain/features/student-import.md` (documented `gender` vs `parsedGender`)
- Checks run: `git diff --check` passed cleanly. `bun --filter @school-clerk/dashboard typecheck` passed (only known baseline errors remain, no touched file errors).
- Brain docs updated: `brain/features/student-import.md` updated.
- Unresolved issues: None.
