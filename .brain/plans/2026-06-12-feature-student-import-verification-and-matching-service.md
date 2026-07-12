# Plan: Student Import Verification And Matching Service

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
- Intake Item: Verify each student in an optimized way, infer missing gender from existing first names, and typo-match existing students.

## Goal Or Problem
The current import workflow verifies rows client-side by filtering all recent records for every row. It only uses exact Arabic-normalized equality on first/surname fields and does not provide confidence levels, typo tolerance, or first-name gender inference. Operators need one optimized verification step that returns full matches, suspected matches, inferred gender, and relevant existing enrollment records.

## Current Context
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx` calls `_trpc.students.studentsRecentRecord.queryOptions({})`, then performs matching in the browser for every pasted row.
- `apps/api/src/db/queries/students.ts` implements `studentsRecentRecord`, returning student identity plus a representative term sheet/classroom/session/term record.
- `apps/dashboard/src/actions/get-name-gender.ts` already hints at first-name gender lookup behavior.
- `Students.gender` is required in Prisma, so missing gender must be resolved before creating new students.
- Current matching does not distinguish full match from suspected typo match with scores and reasons.

## Proposed Approach
Add a server-side verification procedure that accepts parsed import rows plus selected classroomDepartmentId and current term/session context. It should load tenant-scoped candidate students, class departments, and current term sheets once; infer missing gender from existing students with the same normalized first name; compute full and suspected matches with confidence scores; and return a compact per-row verification report for the review UI. Keep the algorithm deterministic and explainable rather than opaque.

## Implementation Steps
- Define a verification input schema with:
  - `classroomDepartmentId`
  - rows containing `lineNumber`, `originalText`, `name`, `surname`, `otherName`, and optional gender
  - optional import options such as suspected-match threshold
- Add a backend query/procedure, likely under `students.verifyStudentImport` or a service helper called by the student router.
- Fetch once per verification:
  - active school profile/session/term from `ctx.profile`
  - selected classroom department and session ownership
  - tenant students with non-deleted records and relevant term/session forms
  - first-name-to-gender frequency map from existing students in the same tenant
- Normalize names consistently:
  - trim/collapse spaces
  - case-fold Latin names
  - reuse or relocate Arabic normalization from the existing import component into a shared helper
  - strip common punctuation/tatweel/diacritics where appropriate
- Classify matches per row:
  - `fullMatch`: strong match on normalized `name` + `surname` + compatible `otherName`
  - `suspectedMatches`: typo-aware candidates using edit distance/token similarity over name parts
  - include confidence score and reasons such as `same first name`, `surname typo`, `same classroom`, `current term sheet exists`
- Infer gender only when row/global input did not provide one:
  - use existing students with same normalized first name
  - choose a gender only if the sample is sufficiently decisive
  - return inference source/count/confidence
  - return `needsGender` when inference is unavailable or ambiguous
- Include match record metadata for each candidate:
  - student id
  - firstName/name, surName/surname, otherName
  - gender
  - session name/id
  - term name/id
  - classroom display/id
  - studentSessionFormId
  - studentTermFormId / termSheetId
  - whether current term/classroom already matches
- Return row status buckets suitable for the UI:
  - `readyToImport`
  - `matchFound`
  - `needsAttention`
- Avoid returning large assessment/finance child records.

## Affected Files Or Areas
- `apps/api/src/trpc/routers/students.routes.ts`
- `apps/api/src/db/queries/students.ts` or a new import-specific query file under `apps/api/src/db/queries/`
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
- `apps/dashboard/src/actions/get-name-gender.ts`
- `packages/utils/src/` for shared name normalization if appropriate
- `brain/api/contracts.md`
- `brain/api/endpoints.md`

## Acceptance Criteria
- Verification runs through one backend request for the whole pasted batch, not one request per student.
- Verification is tenant-scoped by `ctx.profile.schoolId` and validates the selected classroom belongs to the active school/session.
- Missing gender is inferred from existing students' first names when confidence is strong enough.
- Rows with ambiguous or unavailable gender inference are flagged for manual resolution.
- Full matches and suspected matches are returned separately with confidence/reason metadata.
- Suspected matching catches common typos in first name, surname, or otherName without automatically treating them as full matches.
- Each returned match shows session, term, and class metadata needed by the review screen.
- The response is compact enough for normal classroom-sized batches.

## Test Plan
- Run `bun --filter @school-clerk/api typecheck`.
- Run `bun --filter @school-clerk/dashboard typecheck` if dashboard types consume the new contract.
- Add focused unit tests for normalization/scoring helpers if the repo has a nearby test pattern; otherwise document manual verification cases.
- Manually verify:
  - exact existing student returns full match
  - typo in surname returns suspected match
  - same first name with missing gender infers gender
  - ambiguous gender remains unresolved
  - selected classroom outside active session is rejected
  - large paste verifies with one network call.

## Brain Update Requirements
- Update `brain/api/contracts.md` with the verification payload/response contract.
- Update `brain/api/endpoints.md` with the new or changed tRPC procedure.
- Update or create `brain/features/student-import.md` with matching and gender inference rules.

## Completion
- Completed: 2026-06-13
- Landed Commit: `0e19470`
- Active Handoff: `brain/handoffs/completed/2026-06-12-student-import-verification-and-matching-service-handoff.md`
- Outcome: Approved verification service landed into `main`; batch verification now runs through `students.verifyStudentImport` with gender inference and match metadata.

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
- Aggressive fuzzy matching can produce false positives. Keep suspected matches review-only and require explicit user action.
- Gender inference can be culturally ambiguous. Use confidence thresholds and never override explicit row/global gender.
- Existing `studentsRecentRecord` may be useful for legacy UI; avoid breaking it unless all call sites are updated.
