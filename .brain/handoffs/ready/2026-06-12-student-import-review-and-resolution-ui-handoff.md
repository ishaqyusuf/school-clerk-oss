# Brain Handoff: Student Import Review And Resolution UI

## Status
Ready

## Source Plan
brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md

## Task
- Task Title: Student Import Review And Resolution UI
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: This is an interactive dashboard review workflow with tabs, batch actions, row overrides, and product-flow verification.

## Goal
Rework the student import review screen into clear `Ready to import` and `Match Found` tabs with counts, parsed-name display, full/suspected match sections, session/term/class match details, batch defaults, and row-level resolution actions.

## Context To Read First
- brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md
- brain/intake/2026-06-12-student-import-polish.md
- brain/BRAIN.md
- brain/system/overview.md
- brain/system/architecture.md
- brain/engineering/ai-rules.md
- brain/engineering/coding-standards.md
- apps/dashboard/src/components/modals/student-import/index.tsx
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- apps/dashboard/src/components/submit-button.tsx
- apps/dashboard/src/utils/utils

## Implementation Instructions
1. Replace the current `all/imported/conflict/new` filter select with review tabs: `Ready to import (x)`, `Match Found (x)`, and optional `Needs attention (x)`.
2. Render ready rows with line number, original text, parsed `name`/`surname`/`otherName`, resolved/inferred gender, selected classroom, and row action state.
3. Render match rows with imported parsed fields beside database match candidates.
4. Visually separate full matches from suspected matches, including confidence/reason labels when available.
5. Show match record metadata: session, term, class, student id/name/gender, and whether current term sheet exists.
6. Add batch controls for full-match and suspected-match defaults while preserving explicit per-row overrides.
7. Add per-row resolution choices where valid: `Import new`, `Keep match`, `Update match with name`, and optional `Skip`.
8. Block execution state when required choices are missing, such as unresolved gender or unselected suspected match.
9. Keep the UI dense, operational, RTL-friendly, and consistent with existing SchoolClerk dashboard components.

## Acceptance Criteria
- Verification results render in tabbed sections with accurate counts.
- `Ready to import` tab includes `Import all` and row-level `Import new` controls.
- `Match Found` tab displays full matches and suspected matches distinctly.
- Every match candidate shows session, term, and class metadata.
- Each row displays parsed report fields matching database names: `name`, `surname`, and `otherName`.
- Batch actions can set defaults without unexpectedly overwriting explicit row overrides.
- Each row supports valid `Import new`, `Keep match`, and `Update match with name` actions.
- Rows with unresolved gender or ambiguous match selection are visibly blocked from import.
- The current modal does not fire create/update/enroll mutations during verification/review.

## Files Or Areas Likely Involved
- apps/dashboard/src/components/modals/student-import/index.tsx
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- apps/dashboard/src/components/static-trpc
- apps/dashboard/src/components/submit-button.tsx
- apps/dashboard/src/utils/utils

## Do Not Change
- Do not implement the backend verification algorithm unless it is already available and only wiring is needed.
- Do not implement batch execution in this handoff.
- Do not change student persistence semantics.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- Manual UI verification for no matches, exact matches, suspected typo matches, unresolved gender rows, existing term sheet rows, and missing term sheet rows.
- Manual responsive/overflow verification for long names and RTL names.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-review-and-resolution-ui.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/student-import.md`: create or update with the review/resolution UI behavior.
- `brain/api/endpoints.md`: update only if API routes changed.
- `brain/api/contracts.md`: update only if request/response shapes changed.
- `brain/api/permissions.md`: update only if auth or permissions changed.
- `brain/database/schema.md`: update only if schema changed.
- `brain/database/migrations.md`: update only if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:
