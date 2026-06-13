# Brain Handoff Review: Student Import Input And Name Parsing

## Reviewed Handoff
brain/handoffs/ready/2026-06-12-student-import-input-and-name-parsing-handoff.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json

## Execution Path
/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-input-and-name-parsing

## Source Plan
brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md

## Result
Needs Fix

## Findings
- [P1] `apps/dashboard/src/components/modals/student-import/import-activities.tsx:316` references `student.gender` before `student` is declared. The submitted dashboard typecheck confirms this with `TS2552: Cannot find name 'student'`, so the touched import activity cannot compile.
- [P1] `apps/dashboard/src/components/modals/student-import/index.tsx:154-160` passes a display string like `<class> - <department>` as `student.classRoom`, but `import-activities.tsx:94-96` still resolves the selected classroom by comparing only `records.classDepartments[].departmentName`. For normal classRoom-backed departments, the selected target classroom will not resolve, leaving `activity.classRoom` undefined and causing create/enroll actions to fail when they read `activity.classRoom.id`.
- [P1] `apps/dashboard/src/components/modals/student-import/index.tsx:239` renders a Radix `SelectItem` with `value=""`. This project's `@school-clerk/ui/select` wraps `@radix-ui/react-select`, whose item values cannot be empty strings because empty string is reserved for clearing the select. Opening/rendering the Global Gender select can throw instead of allowing the optional unset state.
- [P1] `apps/dashboard/src/components/modals/student-import/import-activities.tsx:356-359` still converts any non-`"M"` gender to `"Female"` when linking/updating a partial match. That silently writes Female for rows with missing gender, violating the handoff requirement that rows with no row/global gender remain missing for later inference/resolution.
- [P2] `apps/dashboard/src/components/modals/student-import/index.tsx:20-108` returns parsed students without `lineNumber`, `originalText`, row gender, effective input gender, or selected classroomDepartmentId. The handoff explicitly required those fields so the next verification/review steps can show stable row provenance and avoid re-resolving the selected class by display text.

## Acceptance Criteria Check
- The import modal accepts one student per non-empty line: Partial.
- Classroom is selected once from current-session classroom departments before verification: Fail, selected ID is not carried into parsed rows/import activity.
- Global gender is optional and applies only to rows without an explicit gender: Partial, but unset select is implemented with an invalid empty Radix item.
- Explicit row gender overrides global gender: Pass by inspection.
- Rows with no row/global gender remain missing for later backend inference: Fail, partial-match update still silently maps missing gender to Female.
- Parsed preview/report data includes firstName/name, surName/surname, and otherName: Partial, but required row metadata is missing.
- Invalid or empty lines are surfaced with line numbers and do not crash the modal: Partial, blank lines are skipped rather than surfaced.
- Existing raw text local storage behavior remains usable: Pass by inspection.

## Checks
- `bun --filter @school-clerk/dashboard typecheck`: Fail. There are many known baseline errors, plus a new touched-file error at `src/components/modals/student-import/import-activities.tsx(316,40): error TS2552: Cannot find name 'student'. Did you mean 'students'?`
- Manual parser/code review for no gender, explicit gender, aliases, multiple names, blank lines, extra whitespace, and missing classroom: Fail due to the findings above.

## Brain Update Check
- `brain/progress.md`: Present.
- `brain/features/student-import.md`: Present.
- API docs: Modified unrelated staff onboarding API docs in this worktree; not required for this handoff and should be reverted or justified separately.
- `brain/tasks/in-progress.md`: Present, task kept in progress.

## Decision
The implementation is close in direction but cannot be approved while the touched UI fails typecheck and the selected classroom/gender contracts can break the import workflow. A focused fix handoff was created.

## Follow-Up
brain/handoffs/fixes/2026-06-12-student-import-input-and-name-parsing-fix-1.md
