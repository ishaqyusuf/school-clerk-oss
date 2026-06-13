# Brain Fix Handoff: Student Import Input And Name Parsing Fix 1

## Status
Ready

## Source Review
brain/reviews/2026-06-12-student-import-input-and-name-parsing-review.md

## Original Handoff
brain/handoffs/ready/2026-06-12-student-import-input-and-name-parsing-handoff.md

## Source Plan
brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json

## Goal
Fix only the blocking review findings for the student import input/name parsing handoff.

## Fix Items
1. Fix the compile error in `apps/dashboard/src/components/modals/student-import/import-activities.tsx`: do not reference `student` before it is declared. Use `activity.student` or move the local declaration before it is needed.
2. Carry the selected classroom department identity through parsed rows. Parsed students should include `classroomDepartmentId` plus a display label. `ImportActivity` should resolve `activity.classRoom` by ID first, not by comparing display text to `departmentName`.
3. Replace the empty-string Radix select item for Global Gender with a safe sentinel value such as `"unset"`, while still storing/normalizing unset as no global gender for parsing.
4. Preserve missing gender through every path. Do not map undefined/missing gender to Female. Disable or route actions that require a required gender into a later inference/resolution state instead of sending an incorrect gender.
5. Expand parsed row shape to include `lineNumber`, `originalText`, row-level parsed gender, effective input gender, and selected `classroomDepartmentId`, as required by the original handoff/source plan.
6. Revert unrelated Brain API doc edits in `brain/api/contracts.md` and `brain/api/permissions.md`, unless they are intentionally part of another active handoff.

## Context To Read First
- brain/reviews/2026-06-12-student-import-input-and-name-parsing-review.md
- brain/handoffs/ready/2026-06-12-student-import-input-and-name-parsing-handoff.md
- brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md
- apps/dashboard/src/components/modals/student-import/index.tsx
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- packages/ui/src/components/select.tsx
- apps/dashboard/src/components/forms/student-form.tsx

## Acceptance Criteria
- The touched import files have no new TypeScript errors, especially no `Cannot find name 'student'` error.
- Target classroom selection is carried as a classroom department ID into the verification/import activity.
- Import activity can create/enroll/link using the selected classroom department without relying on display-name matching.
- Global Gender can be unset without rendering an empty `SelectItem value=""`.
- Missing gender remains missing; no create/update path silently converts missing gender to Female.
- Parsed rows preserve line number, original text, row gender, effective input gender, and selected classroom department ID.
- Existing raw text local storage behavior remains usable.

## Do Not Change
- Do not implement fuzzy matching or batch execution in this fix.
- Do not change the Prisma student schema.
- Do not move the task to done.
- Do not broaden the scope beyond the review findings.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck` and report whether failures are baseline or touched-file errors.
- Focused manual/parser checks for no gender, explicit gender, aliases, multiple names, blank lines, extra whitespace, missing classroom, and selected classroom department ID flow.

## Brain Update Contract
- Update `brain/progress.md` with fix completion notes.
- Update `brain/features/student-import.md` only if the documented input contract changes.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes
Fill this in after implementation:

- Changed files:
  - `apps/dashboard/src/components/modals/student-import/index.tsx`
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- Checks run: `bun --filter @school-clerk/dashboard typecheck` (No new errors in touched files).
- Brain docs updated: Reverted `brain/api/contracts.md` and `brain/api/permissions.md`.
- Unresolved issues: None.
