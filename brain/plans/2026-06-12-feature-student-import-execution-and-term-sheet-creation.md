# Plan: Student Import Execution And Term Sheet Creation

## Type
Feature

## Status
In Progress

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Intake
- Intake File: brain/intake/2026-06-12-student-import-polish.md
- Intake Item: Execute import decisions, keep or update matches, import fresh students, and create term sheet if not already created.

## Goal Or Problem
After review, the importer must safely apply selected resolutions. It should create fresh students when requested, keep matched students without duplicating student records, update matched names only when explicitly requested, and create the active term sheet/enrollment record if a kept or updated match is not already enrolled for the current term/classroom.

## Current Context
- `students.createStudent` creates a `Students` record plus current session/term forms and applies fee histories through `applyFeeHistoriesToStudentTermForm`.
- `academics.entrollStudentToTerm` can enroll an existing student into a term/classroom, but the current UI calls it per row.
- `students.updateStudentBasicProfile` updates basic name/gender fields.
- `StudentSessionForm` and `StudentTermForm` are the session/term sheet records used across student overview, finance, attendance, and reports.
- Student creation currently applies current term fee histories to the term form; import execution should preserve that behavior for both new and newly-created term sheets where appropriate.

## Proposed Approach
Add a batch import execution mutation that accepts the verified rows and selected resolutions. Run all row decisions in a tenant-scoped transaction or chunked transactions with idempotent lookups. For each row, create a new student or resolve against a selected existing student, update names only when requested, ensure a current session form and current term form exist for the selected classroom, apply fee histories to newly-created term forms, and return a row-by-row result summary for the UI.

## Implementation Steps
- Define an execution input schema:
  - `classroomDepartmentId`
  - verification batch id or row payload snapshot if no persistence is used
  - rows with `lineNumber`, parsed name/gender fields, selected action, selected match student id, and selected match term/session metadata where relevant
- Add a backend mutation, likely `students.executeStudentImport`.
- Validate:
  - active `ctx.profile.schoolId`, `sessionId`, and `termId` are present
  - selected classroom department belongs to active school/session
  - every selected existing student belongs to the active tenant
  - every row has a final gender for `Import new`
- For `Import new`:
  - create student with parsed fields, selected/inferred gender, selected classroomDepartmentId, active session, active term
  - reuse `createStudent` service behavior where possible to keep fee-history application consistent
- For `Keep match`:
  - do not change student identity fields
  - ensure current `StudentSessionForm` exists for active session
  - ensure current `StudentTermForm` exists for active term and selected classroom
  - if an active current term sheet exists in another classroom, TODO: decide whether to update classroom, create another sheet, or block for manual review
- For `Update match with name`:
  - update `Students.name`, `Students.surname`, `Students.otherName`, and optionally gender only from explicit/import-resolved values
  - then apply the same current term sheet creation/repair as `Keep match`
- Make term sheet creation idempotent:
  - reuse existing non-deleted current term form when present
  - avoid duplicate current-term forms for the same student
  - soft-handle duplicates according to existing promotion/import patterns if duplicates are discovered
- Apply fee histories to newly-created current term forms using `applyFeeHistoriesToStudentTermForm`.
- Return summary counts:
  - created students
  - kept matches
  - updated matches
  - term sheets created
  - skipped rows
  - failed rows with reasons
- Invalidate dashboard queries:
  - `students.index`
  - `students.analytics`
  - `students.studentsRecentRecord`
  - relevant classroom/report/finance queries if term sheets or fee histories were applied.
- Add UI success summary and row status updates after execution.

## Affected Files Or Areas
- `apps/api/src/trpc/routers/students.routes.ts`
- `apps/api/src/db/queries/students.ts` or a new import-specific query/service file
- `apps/api/src/db/queries/enrollment-query.ts`
- `apps/api/src/db/queries/student-fee-application.ts`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `apps/dashboard/src/components/modals/student-import/index.tsx`
- `packages/db/src/schema/student.prisma` for model reference only; no schema change expected
- `brain/api/contracts.md`
- `brain/api/endpoints.md`
- `brain/features/student-import.md`
- `brain/database/relationships.md` if term-sheet relationship behavior is newly documented

## Acceptance Criteria
- Import execution applies all selected row actions through a batch mutation.
- New students are created with selected classroom, active session, active term, and final gender.
- Keeping a match does not duplicate the `Students` row.
- Keeping or updating a match creates the active term sheet when it does not already exist.
- Existing current term sheets are reused rather than duplicated.
- `Update match with name` changes only the selected matched student and uses the parsed firstName/name, surName/surname, and otherName fields.
- Execution returns a row-level result summary and aggregate counts.
- Student list, analytics, recent-record verification, and relevant classroom/report views refresh after successful import.
- Fee-history application remains consistent with normal student creation/enrollment for newly-created term sheets.

## Test Plan
- Run `bun --filter @school-clerk/api typecheck`.
- Run `bun --filter @school-clerk/dashboard typecheck`.
- Manually verify:
  - import-all creates new students and current term sheets
  - exact match with no current term sheet creates only the term sheet
  - exact match with current term sheet creates no duplicate
  - suspected match can be kept only after explicit selection
  - update-match changes name fields and creates/keeps term sheet
  - failures are reported per row without hiding successful rows.
- If test infrastructure exists nearby, add focused tests for idempotent term sheet creation.

## Brain Update Requirements
- Update `brain/api/contracts.md` with the execution mutation payload and result summary.
- Update `brain/api/endpoints.md` with the new or changed tRPC procedure.
- Update or create `brain/features/student-import.md` with import action semantics.
- Update `brain/database/relationships.md` if the term sheet creation/reuse rule is newly formalized.
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
- Student uniqueness includes nullable `deletedAt`, so duplicate prevention should use explicit tenant/name matching and existing student ids rather than relying only on database uniqueness.
- Current-term duplicates may already exist from older workflows. The mutation should avoid making duplicates worse and report discovered conflicts.
- Updating a matched name can be destructive if the operator selected the wrong suspected match. Keep the action explicit and visible in the review UI.
- Applying fees to term sheets can affect finance balances. Confirm expected fee application behavior before broad rollout if schools use automatic fee histories.
