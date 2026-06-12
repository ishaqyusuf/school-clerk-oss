# Plan: Assessment Recording Page Polish

## Type
UX/UI

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Intake
- Intake File: brain/intake/2026-06-12-report-pages-and-sidebar-polish.md
- Intake Item: Assessment-recording page header and mobile polish, subject defaulting, total-column hiding, and clearer assessment-editing affordance.

## Goal Or Problem
The assessment recording page should feel focused and mobile-friendly. The header subject selector is no longer needed, the page has too much mobile horizontal padding, the default subject view should start with the first available subject, total columns should be hidden from the score-entry table, and users should clearly understand that clicking a subject opens assessment setup.

## Current Context
- `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/assessment-recording/page.tsx` renders the assessment recording route.
- `apps/dashboard/src/components/assessment-recording.tsx` owns the fixed header, classroom selector, subject selector, report sheet link, and page padding.
- `apps/dashboard/src/components/assessment-recording-results-table.tsx` owns subject filtering, score cells, subject header buttons, and subject total columns.
- The current header uses a fixed `sm:max-w-4xl` container with `px-4` and a subject dropdown.
- The table currently defaults to all subjects when no `deptSubjectId` is present.
- Subject header buttons already open `SubjectAssessments`, but the UI does not explicitly explain that behavior.

## Proposed Approach
Simplify the assessment recording shell around classroom context and score entry. Remove the header subject selector, keep classroom/term context clear, seed the table's subject filter to the first subject when no subject is selected, and make the page responsive with tighter mobile padding. Keep subject update behavior on table header clicks and add concise helper copy near the subject filter/header area.

## Implementation Steps
- Remove the header subject dropdown from `AssessmentRecording`; keep classroom selection only where permissions allow it.
- Make the fixed header responsive on narrow screens with wrapping or stacked content, avoiding overflow from classroom names and links.
- Reduce mobile horizontal padding on the assessment recording page; keep comfortable desktop width constraints.
- When report data loads and no subject filter/URL subject is selected, default `AssessmentRecordingResultsTable` to the first subject in the loaded subjects list.
- Keep the in-table subject filter available if needed, but ensure the default is a single first subject rather than all subjects.
- Add short helper text or an info affordance near the subject header/filter: "Click a subject to update assessments."
- Hide subject total columns in the assessment recording score-entry table while keeping editable assessment score cells visible.
- Ensure empty states still guide users to select a classroom when required.
- Coordinate with `brain/plans/2026-06-12-ux-ui-shared-report-roster-sorting-and-gender-controls.md` so student sorting and gender controls are not duplicated locally.

## Affected Files Or Areas
- `apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/assessment-recording/page.tsx`
- `apps/dashboard/src/components/assessment-recording.tsx`
- `apps/dashboard/src/components/assessment-recording-results-table.tsx`
- `apps/dashboard/src/hooks/use-assessment-recording-params.ts`
- `apps/dashboard/src/utils/tenant-page-metadata.ts`
- `brain/features/assessment-results-and-sub-assessments.md`
- `brain/progress.md`

## Acceptance Criteria
- The assessment recording header no longer contains a subject selector.
- The page has visibly reduced horizontal padding on mobile and does not overflow on narrow screens.
- Header content remains clean and readable on mobile and desktop.
- When a classroom has subjects and no subject is selected in the URL, the table defaults to the first subject.
- The assessment recording table no longer shows subject total columns.
- A visible info cue tells users to click a subject to update assessments.
- Clicking a subject still opens the subject assessment editor.
- Existing score entry cells continue to save and display as before.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify `/assessment-recording` on mobile and desktop widths.
- Manually verify default subject selection when opening with only `deptId` and `termId`.
- Manually verify explicit `deptSubjectId` URLs still open the requested subject.
- Manually verify subject click opens the assessment editor and score entry still works.

## Brain Update Requirements
- Update `brain/features/assessment-results-and-sub-assessments.md` if default subject-filter behavior or score-entry table rules are formalized there.
- Update `brain/progress.md` or the active progress file after implementation.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Defaulting to the first subject must not override an explicit `deptSubjectId` URL parameter.
- Removing total columns should only affect assessment recording, not classroom report summaries where totals are still useful unless separately requested.
- The fixed header can cover table controls if spacing is not recalculated after responsive changes.

## Open Questions
- None.

## Linked Task
- Task Title: Assessment Recording Page Polish
- Task File: brain/tasks/roadmap.md
