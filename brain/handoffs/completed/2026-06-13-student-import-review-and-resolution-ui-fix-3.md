# Brain Fix Handoff: Student Import Review And Resolution UI Fix 3

## Status

Completed

## Source Review

brain/reviews/2026-06-13-student-import-review-and-resolution-ui-review-v3.md

## Original Handoff

brain/handoffs/fixes/2026-06-13-student-import-review-and-resolution-ui-fix-2.md

## Source Plan

brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md

## Queue Item

/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-review-and-resolution-ui.json

## Goal

Fix only the suspected-match blocked-state condition so Import new and Skip are treated as complete decisions that do not require selecting an existing match candidate.

## Fix Items

1. Update row suspected-match validation so selectedMatchId is required only when the current resolution needs an existing match, such as keep_match or update_match.
2. Ensure choosing Import new or Skip on a suspected-match row immediately clears the red blocked styling and Action required message when a resolution is present.
3. Ensure the Possible Matches batch default options Import new and Skip also clear the blocked state for untouched suspected rows without selecting a candidate.
4. Keep live form/state-driven row rendering so row-level candidate selection and action state update immediately.

## Acceptance Criteria

- Suspected row with resolution keep_match or update_match and no selectedMatchId remains visibly blocked.
- Suspected row with resolution create/import_new is not visibly blocked just because selectedMatchId is empty.
- Suspected row with resolution skip is not visibly blocked just because selectedMatchId is empty.
- Possible Matches batch default create/import_new and skip produce rows that are not shown as Action required unless some other required field is missing.
- Row-level candidate selection and selected highlight still update immediately from live state.

## Completion Notes

- Changed files: `apps/dashboard/src/components/modals/student-import/import-activities.tsx`, `brain/features/student-import.md`, `brain/progress.md`, `brain/tasks/in-progress.md`, `brain/tasks/done.md`
- Checks run: `bun --filter @school-clerk/dashboard typecheck` still fails on pre-existing baseline errors outside the touched import UI. No errors were reported for the touched import modal.
- Brain docs updated: `brain/features/student-import.md`, `brain/progress.md`, `brain/tasks/in-progress.md`, `brain/tasks/done.md`
- Unresolved issues: Manual browser verification was not run in this session.
