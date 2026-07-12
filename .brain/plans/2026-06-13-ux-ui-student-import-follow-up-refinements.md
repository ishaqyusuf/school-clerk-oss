# Plan: Student Import Follow-Up Refinements

## Type
UX/UI

## Status
Done

## Created Date
2026-06-13

## Last Updated
2026-06-17

## Intake
- Intake File: brain/intake/2026-06-13-student-import-follow-up-refinements.md
- Intake Item: Refine student batch import parsing, gender controls, name chips, default actions, skip availability, and cancel behavior.

## Goal Or Problem
The student batch import flow needs a tighter operator-facing review experience after the initial import workflow landed. Operators should get predictable name splitting for punctuation-delimited pasted rows, compact gender selection, visible name-part chips, safer action defaults, disabled irrelevant skip actions, and a clear way to cancel/reset an import before execution.

## Current Context
- `brain/features/student-import.md` documents the current student import flow, including whitespace name splitting, row/global gender behavior, review tabs, default `Import new` for ready rows, and dashboard-only `Skip`.
- `brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md` is done and documented the first-pass parser.
- `brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md` is still marked In Progress, while `brain/tasks/done.md` records the review UI work as landed; this follow-up should not reopen that whole plan.
- Likely implementation files are `apps/dashboard/src/components/modals/student-import/index.tsx` for start-screen parsing and gender controls, and `apps/dashboard/src/components/modals/student-import/import-activities.tsx` for review row rendering and action defaults.
- The existing import execution mutation supports `import_new`, `keep_match`, and `update_match_with_name`; `skip` remains dashboard-only and is omitted from the execution payload.

## Proposed Approach
Make a focused dashboard pass over the existing import modal. Update the parser so name parts are split by comma or dot when either punctuation delimiter is present, otherwise split by whitespace; trim each part, filter empty values, and assign first name, surname, and other name deterministically. Replace gender selection affordances with shadcn-style grouped `[m]` and `[f]` buttons where the flow asks for gender. In the review UI, render parsed name parts as separate badges/chips, default no-conflict rows to `Import new`, disable `Skip` for rows with no match, and add a cancel import control that clears staged import state and returns the user to the initial import state before execution.

## Implementation Steps
- Locate the current parser in `apps/dashboard/src/components/modals/student-import/index.tsx` or any extracted student-import helper.
- Change name-part splitting to:
  - inspect the name text for `,` or `.`
  - if punctuation is present, split on comma and dot delimiters
  - otherwise split on whitespace
  - trim all parts
  - filter empty members
  - map `[firstName, surname, ...rest]`, joining remaining parts into `otherName`
- Preserve line numbers, original text, warnings, classroom selection, and existing missing-gender behavior.
- Replace current gender controls with a shadcn-style grouped button control for `m` and `f`, mapping values to canonical `Male` and `Female`.
- Apply the same grouped gender control to manual per-row gender resolution if that UI exists in the review step.
- Render parsed name parts as individual badges/chips in review rows, preserving the current database field mapping:
  - `firstName` / `name`
  - `lastName` / `surname`
  - `otherName`
- Ensure rows with no full or suspected match initialize with `Import new` selected.
- Disable the `Skip` action for rows with no match found; keep `Skip` available only where the row is a match/conflict/attention decision that the operator can intentionally omit.
- Add a cancel import action that is available before final execution, clears staged parsed/verified rows and local import state where appropriate, and returns to the import input state or closes the modal according to existing modal conventions.
- During execution/submission, prevent cancel from implying rollback of already-submitted database writes; show it only as disabled/loading or as a post-execution reset according to existing UI patterns.

## Affected Files Or Areas
- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `@school-clerk/ui` shadcn button, toggle group, badge, and dialog primitives
- `brain/features/student-import.md`
- `brain/progress.md`

## Acceptance Criteria
- Pasted name text containing `,` or `.` splits name parts by those punctuation delimiters after trimming/filtering empty values.
- Pasted name text without `,` or `.` splits name parts by whitespace after trimming/filtering empty values.
- Parsed rows assign first name, surname, and other name deterministically and preserve the original line for review.
- Gender selection uses a grouped shadcn button UI with clear `m` and `f` choices mapped to `Male` and `Female`.
- Review rows display first name, last name/surname, and other name as separate chips or badges.
- No-match rows default to `Import new` without requiring an extra operator click.
- `Skip` is disabled for no-match rows.
- Cancel import clears the staged import flow before execution and returns the user to the expected initial/closed state without persisting new students.
- Existing match-resolution actions and import execution payload semantics continue to work.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify parsing examples:
  - `Aisha Musa Haliru`
  - `Aisha, Musa, Haliru`
  - `Aisha.Musa.Haliru`
  - rows with extra spaces and repeated delimiters
  - rows with missing surname or missing otherName
- Manually verify global/manual gender controls render as grouped `[m]` and `[f]` buttons and submit canonical values.
- Manually verify a no-match row starts as `Import new` and cannot use `Skip`.
- Manually verify match/conflict rows still allow valid resolution actions.
- Manually verify cancel before execution clears staged data and does not call the import execution mutation.

## Brain Update Requirements
- Update `brain/features/student-import.md` with the revised delimiter parsing, grouped gender control behavior, name-chip review display, skip-disabled rule, default import-new rule, and cancel import behavior.
- Update `brain/progress.md` or task tracking when implementation completes.

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
- Commas are currently documented as separating the name part from an optional row gender part. The implementation must avoid surprising operators if comma-delimited name parts and row-level gender aliases coexist.
- Dot-delimited names may appear in initials or abbreviations. Keep the original line visible and ensure review chips make parsing mistakes obvious before execution.
- Cancel import must not promise rollback after execution has already submitted database writes.

## Open Questions
- None.

## Linked Task
- Task Title: Student Import Follow-Up Refinements
- Task File: brain/tasks/roadmap.md

## Completion
- Completed: 2026-06-17
- Outcome: The student import follow-up refinements are implemented. The parser now supports comma/dot-delimited name parts while preserving row-level gender aliases, global/manual gender selection uses compact `M`/`F` toggle controls, review rows show parsed name chips, no-match rows default to `Import new`, `Skip` is disabled where there is no match candidate, and `Cancel Import` returns to the initial import screen before execution.
- Brain Updates: `brain/features/student-import.md`, `brain/progress.md`, `brain/tasks/done.md`, `brain/tasks/roadmap.md`.
