# Brain Intake: Student Import Polish

## Status
Handed Off

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Raw Input
Polish student import so an operator can paste one student per line as `student, gender`, select a classroom, optionally select a global gender, infer missing gender from existing students' first names, verify students efficiently with typo-aware matching, review parsed first/surname/otherName fields against database records, resolve full/suspected matches with batch and per-row actions, show matched session/term/class records, and create the current term sheet when needed.

## Generated Plans
- [x] Student Import Input And Name Parsing - `brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md` - Status: In Progress
- [x] Student Import Verification And Matching Service - `brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md` - Status: In Progress
- [x] Student Import Review And Resolution UI - `brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md` - Status: In Progress
- [x] Student Import Execution And Term Sheet Creation - `brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md` - Status: In Progress

## Recommended Execution Order
1. Student Import Input And Name Parsing - establishes the user input contract, classroom/global gender controls, and stable parsed records for later steps.
2. Student Import Verification And Matching Service - moves matching/gender inference to an optimized tenant-scoped backend/service layer.
3. Student Import Review And Resolution UI - depends on verification output to render ready/match tabs, counts, and resolution controls.
4. Student Import Execution And Term Sheet Creation - depends on selected row resolutions and must remain idempotent when creating students or term sheets.

## Agent Recommendations
- Student Import Input And Name Parsing: open-code - narrow dashboard UI/parser change in the existing import modal.
- Student Import Verification And Matching Service: open-code - server/service logic with matching heuristics and query optimization.
- Student Import Review And Resolution UI: open-code - interactive dashboard component work using existing table/sheet/modal patterns.
- Student Import Execution And Term Sheet Creation: open-code - mutation and data integrity work around student/session/term records.

## Merged Items
- "Dump student names", "One line per student (student, gender)", "Select classroom", "Optional select global gender", and "Report list should split names to match db record, firstName, surName, otherName" were merged into the input/parsing plan because they define the import payload shape.
- "Where gender is not set, cleverly use existing students first name to guess gender", "Verify each student in optimized way", and "Look out for typos and cleverly match" were merged into the verification/matching service plan because they require the same indexed candidate set and scoring pass.
- "Report screen tabs", "batch action", "Each line will have its action", and "Show also, the match record" were merged into the review/resolution UI plan because they are one review workflow.
- "Create term sheet if not already created" was separated into the execution plan because it changes persisted academic enrollment state and needs idempotency checks.

## Duplicate Or Existing Items
- Existing component: `apps/dashboard/src/components/modals/student-import/index.tsx` already provides a student import modal with raw comma parsing and local storage.
- Existing component: `apps/dashboard/src/components/modals/student-import/import-activities.tsx` already compares imported rows against `students.studentsRecentRecord` and supports create/enroll/update actions.
- Existing API: `students.studentsRecentRecord`, `students.createStudent`, `students.updateStudentBasicProfile`, and `academics.entrollStudentToTerm` provide pieces of the workflow, but no current plan fully covers the requested polished import workflow.

## Needs Clarification
- Should the pasted `student` name be interpreted as `firstName surname otherName`, or should Arabic/right-to-left school naming still prefer the current `name surname otherName` convention exactly as displayed today?
- Should gender inference be allowed to overwrite an explicit row/global gender, or only fill missing gender?
- Should suspected matches below a defined confidence threshold be hidden, shown as "low confidence", or blocked from bulk action?
- Should "keep match" only create/enroll the current term sheet, or should it also update the student's current classroom/session form when the selected classroom differs?

## Skipped Items
- None.

## Approval Notes
- Approved all generated plans on 2026-06-12 at user request.

## Handoff Notes
- Student Import Input And Name Parsing
  - Handoff: brain/handoffs/ready/2026-06-12-student-import-input-and-name-parsing-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json
  - Agent: antigravity
  - Status: queued
- Student Import Verification And Matching Service
  - Handoff: brain/handoffs/ready/2026-06-12-student-import-verification-and-matching-service-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-verification-and-matching-service.json
  - Agent: open-code
  - Status: queued
- Student Import Review And Resolution UI
  - Handoff: brain/handoffs/ready/2026-06-12-student-import-review-and-resolution-ui-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-review-and-resolution-ui.json
  - Agent: antigravity
  - Status: queued
- Student Import Execution And Term Sheet Creation
  - Handoff: brain/handoffs/ready/2026-06-12-student-import-execution-and-term-sheet-creation-handoff.md
  - Queue Item: /Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-execution-and-term-sheet-creation.json
  - Agent: open-code
  - Status: queued
