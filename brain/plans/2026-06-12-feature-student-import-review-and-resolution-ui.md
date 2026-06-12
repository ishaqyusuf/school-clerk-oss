# Plan: Student Import Review And Resolution UI

## Type
UX/UI

## Status
In Progress

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Intake
- Intake File: brain/intake/2026-06-12-student-import-polish.md
- Intake Item: Report screen tabs for ready imports and matches, with batch and per-row resolution actions plus match record details.

## Goal Or Problem
The current import activity list is a compact collapsible list with basic statuses and individual buttons. Operators need a clearer report screen split into `Ready to import` and `Match Found` tabs, with row-level and batch decisions before any import mutation runs.

## Current Context
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx` renders a filter select over `all`, `imported`, `conflict`, and `new`.
- It currently performs mutations inline from list rows: create student, enroll a match, or update a suspected match's name.
- Existing row data already includes `matches`, `partialMatches`, `student`, `classRoom`, and some match term/class metadata.
- The requested UI needs review-first behavior with explicit actions: import new, keep match, update match with name, import fresh, plus batch behavior for full/suspected matches.

## Proposed Approach
Rework the import activity view into a review dashboard backed by verification output. It should have two primary tabs: `Ready to import (x)` and `Match Found (x)`. The ready tab should provide `Import all` plus per-row edits/actions. The match tab should separate full matches from suspected matches, show imported parsed fields beside database match fields, show session/term/class metadata, and allow batch default actions plus per-row overrides. Mutations should be deferred until the execution plan is implemented.

## Implementation Steps
- Replace the existing status filter select with tabs:
  - `Ready to import (x)`
  - `Match Found (x)`
  - optional `Needs attention (x)` if verification returns unresolved gender/classroom/name issues
- For `Ready to import` rows, show:
  - line number/original text
  - parsed firstName/name, surName/surname, otherName
  - resolved or inferred gender, including confidence/source if inferred
  - selected classroom
  - row action: `Import new`
  - tab action: `Import all`
- For `Match Found` rows, show:
  - imported parsed record
  - full match candidates
  - suspected match candidates with confidence/reason labels
  - match record session, term, class, student id/name/gender
  - current term sheet state: exists / missing / different classroom
- Add batch controls for match rows:
  - apply to full matches: `Keep match` or `Import fresh`
  - apply to suspected matches: `Keep selected match`, `Import fresh`, or leave unresolved
  - TODO: confirm exact wording for requested `[full match | suspect match] import fresh, keep match`
- Add per-row resolution controls:
  - `Import new`
  - `Keep match`
  - `Update match with name`
  - optional `Skip` for rows the operator does not want to import
- Store selected resolutions in local component/form state with clear pending/executed state.
- Prevent execution while required choices are missing, such as unresolved gender or suspected match with no selected candidate.
- Keep UI dense and operational, following existing dashboard/table/modal patterns rather than a marketing-style flow.
- Preserve RTL-friendly rendering for names.

## Affected Files Or Areas
- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `apps/dashboard/src/components/static-trpc` usage patterns
- `apps/dashboard/src/components/submit-button.tsx`
- `@school-clerk/ui` tab, button, table/list, menu, and select components
- `apps/dashboard/src/utils/utils` for `studentDisplayName`

## Acceptance Criteria
- Verification results render in tabbed sections with accurate counts.
- `Ready to import` tab includes an `Import all` action and row-level `Import new` action.
- `Match Found` tab displays full matches and suspected matches distinctly.
- Every match candidate shows session, term, and class metadata.
- Each row displays the parsed report fields matching database names: firstName/name, surName/surname, otherName.
- Batch actions can set defaults for full-match and suspected-match rows without overwriting explicit per-row overrides unless confirmed by user action.
- Each row supports `Import new`, `Keep match`, and `Update match with name` where valid.
- Rows with unresolved gender or ambiguous match selection are visibly blocked from import.
- Current import modal does not fire create/update/enroll mutations during verification/review.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify tab counts for batches containing:
  - no matches
  - exact matches
  - suspected typo matches
  - unresolved gender rows
  - rows where current term sheet exists
  - rows where term sheet is missing.
- Manually verify batch actions and per-row overrides produce the expected pending resolution payload.
- Manually verify long names and RTL names do not overflow modal rows.

## Brain Update Requirements
- Update or create `brain/features/student-import.md` with the review/resolution UI behavior.
- Update `brain/progress.md` or current task tracking when implementation completes.

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
- If the modal grows too large, the implementation may need a full-screen dialog or sheet pattern. Keep this change scoped unless the current modal cannot support the workflow.
- Batch actions over suspected matches can be risky. Make suspected-match defaults reversible before execution.
- Existing import mutation buttons should not remain active in hidden/legacy paths after the review-first UI lands.
