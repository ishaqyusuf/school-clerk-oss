# Brain Handoff: Assessment Recording Page Polish

## Status
Ready

## Source Plan
brain/plans/2026-06-12-ux-ui-assessment-recording-page-polish.md

## Task
- Task Title: Assessment Recording Page Polish
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: open-code
- Reason: Contained page and table UI changes with predictable file boundaries.

## Goal
Make the assessment recording page cleaner and mobile-friendly by removing the header subject selector, reducing mobile padding, defaulting to the first subject, hiding total columns, and clearly signaling that subject headers open assessment setup.

## Context To Read First
- brain/plans/2026-06-12-ux-ui-assessment-recording-page-polish.md
- brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md
- brain/features/assessment-results-and-sub-assessments.md
- apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/assessment-recording/page.tsx
- apps/dashboard/src/components/assessment-recording.tsx
- apps/dashboard/src/components/assessment-recording-results-table.tsx
- apps/dashboard/src/hooks/use-assessment-recording-params.ts

## Implementation Instructions
1. Remove the subject dropdown from the `AssessmentRecording` header while preserving classroom and term context.
2. Make the fixed header wrap or stack cleanly on narrow screens without clipping long classroom names or actions.
3. Reduce mobile horizontal padding for the assessment recording page while keeping desktop spacing comfortable.
4. When report data loads and no explicit `deptSubjectId` is present, default the table subject filter to the first loaded subject.
5. Preserve explicit `deptSubjectId` URL behavior and avoid overriding deep links.
6. Hide subject total columns in the score-entry table while keeping editable assessment cells visible.
7. Add a concise info cue near the subject filter/header area: "Click a subject to update assessments."
8. Confirm clicking a subject still opens the subject assessment editor.

## Acceptance Criteria
- The assessment recording header no longer contains a subject selector.
- The page has visibly reduced horizontal padding on mobile and does not overflow on narrow screens.
- Header content remains clean and readable on mobile and desktop.
- When a classroom has subjects and no subject is selected in the URL, the table defaults to the first subject.
- The assessment recording table no longer shows subject total columns.
- A visible info cue tells users to click a subject to update assessments.
- Clicking a subject still opens the subject assessment editor.
- Existing score entry cells continue to save and display as before.

## Files Or Areas Likely Involved
- apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/assessment-recording/page.tsx
- apps/dashboard/src/components/assessment-recording.tsx
- apps/dashboard/src/components/assessment-recording-results-table.tsx
- apps/dashboard/src/hooks/use-assessment-recording-params.ts
- apps/dashboard/src/utils/tenant-page-metadata.ts

## Do Not Change
- Do not change classroom report sheet totals unless required by this page.
- Do not override explicit subject URL params.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- Manual check: `/assessment-recording` at mobile and desktop widths.
- Manual check: default subject selection with only `deptId` and `termId`.
- Manual check: explicit `deptSubjectId` URLs still open the requested subject.
- Manual check: subject click opens assessment editor and score entry still works.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-13-school-clerk-assessment-recording-page-polish.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/assessment-results-and-sub-assessments.md`: update if default subject-filter behavior or score-entry table rules are formalized.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
- `brain/api/permissions.md`: update if auth or permissions changed.
- `brain/database/schema.md`: update if schema changed.
- `brain/database/migrations.md`: update if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:
