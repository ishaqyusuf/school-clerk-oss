# Plan: Student Import Input And Name Parsing

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-13

## Intake
- Intake File: brain/intake/2026-06-12-student-import-polish.md
- Intake Item: Paste one student per line, select classroom, optionally select global gender, and split names into firstName/surName/otherName for report matching.

## Goal Or Problem
The current student import modal accepts raw comma-separated rows but assumes a loose `name, surname, otherName, gender, classRoom` format and infers classroom from blank/header lines. Operators need a cleaner import start screen: paste one student per line, select a classroom once, optionally select a global gender once, and see deterministic parsed name parts before verification.

## Current Context
- `apps/dashboard/src/components/modals/student-import/index.tsx` renders the current modal and stores raw import text in local storage.
- The current parser runs in a `useMemo` inside the modal, uses comma positions directly, and sets gender with an `M`/`F` toggle-like fallback.
- The existing import activity expects parsed student fields named `name`, `surname`, `otherName`, `gender`, and `classRoom`.
- Student records in `packages/db/src/schema/student.prisma` use `Students.name`, `Students.surname`, `Students.otherName`, and required `Gender` enum values `Male` or `Female`.
- Classroom selection should use the current session classrooms/classroom departments already exposed through existing classroom queries/components, not free-text classroom names.

## Proposed Approach
Replace the free-form classroom-in-line behavior with an explicit classroom select and an optional global gender control. Parse each non-empty line as a student name plus optional row gender, normalize gender to `Male`/`Female` where present, apply global gender only when the row has no gender, and preserve "unknown gender" for the verification service to infer later. The parser should return stable rows with line number, original text, firstName/name, surName/surname, otherName, rowGender, effectiveInputGender, selected classroomDepartmentId, and validation warnings.

## Implementation Steps
- Update the import modal start screen to include:
  - current-session classroom/classroom department select
  - optional global gender select with values `Male`, `Female`, and unset
  - paste area for one student per line
  - parsed row count and validation summary
- Replace the current parser with a small deterministic parser function that can be unit-tested or at least isolated from JSX.
- Support these line forms:
  - `Student Name`
  - `Student Name, Male`
  - `Student Name, Female`
  - short gender aliases such as `M`, `F`, `male`, `female`
- Split the student name into fields compatible with the database/report:
  - first token as `name` / firstName
  - second token as `surname` / surName when present
  - remaining tokens joined as `otherName`
  - TODO: confirm if Arabic/right-to-left names need a different split rule.
- Preserve original line text, parsed line number, and warnings for empty/invalid lines.
- Require a classroom selection before proceeding to verification.
- Keep local storage persistence for raw text and consider persisting selected classroom/global gender only if existing UI patterns support it without surprise.
- Remove or deprecate current behavior where a one-field line changes the classroom context.
- Pass parsed rows plus selected classroom/global gender state into the next verification step.

## Affected Files Or Areas
- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `apps/dashboard/src/components/forms/student-form.tsx` for classroom select reference patterns
- `apps/dashboard/src/components/classroom-header.tsx` for current-session classroom query patterns
- `apps/dashboard/src/hooks/use-local-storage.ts`
- `apps/dashboard/src/actions/schema.ts` or a new client-safe import schema helper if local patterns allow

## Acceptance Criteria
- The import modal accepts one student per non-empty line.
- Classroom is selected once from current-session classroom departments before verification.
- Global gender is optional and applies only to rows without an explicit gender.
- Explicit row gender overrides global gender.
- Rows with no row/global gender are kept as missing gender for backend inference rather than silently defaulting to male or female.
- Parsed preview/report data includes `firstName`, `surName`, and `otherName` equivalents that map to `Students.name`, `Students.surname`, and `Students.otherName`.
- Invalid or empty lines are surfaced with line numbers and do not crash the modal.
- Existing raw text local storage behavior remains usable.

## Test Plan
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually test parsing lines with no gender, explicit `Male`/`Female`, aliases `M`/`F`, multiple middle names, extra whitespace, blank lines, and comma spacing.
- Manually verify the classroom select only shows current-session classroom departments.
- Manually verify the modal cannot proceed to verification without a selected classroom.

## Brain Update Requirements
- Update or create `brain/features/student-import.md` after implementation to document the new input contract.
- Update `brain/progress.md` or current task tracking when implementation completes.

## Completion
- Completed: 2026-06-13
- Landed Commit: `2ebe1d2`
- Active Handoff: `brain/handoffs/completed/2026-06-13-student-import-input-and-name-parsing-fix-2.md`
- Outcome: Approved review fixes landed into `main`; import input now uses explicit classroom/global gender controls and deterministic name parsing.

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
- Name splitting can be culturally ambiguous, especially for Arabic/right-to-left names. Keep the parser transparent and include original text so review can correct mistakes.
- Existing UI uses `name`/`surname`; user-facing copy may say first name/surname. Avoid renaming database-facing fields broadly.
- The current import UI uses right-to-left text area direction. Preserve appropriate RTL support.
