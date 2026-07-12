# Brain Handoff Review: Student Import Verification And Matching Service

## Reviewed Handoff
brain/handoffs/ready/2026-06-12-student-import-verification-and-matching-service-handoff.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-verification-and-matching-service.json

## Execution Path
/Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-verification-and-matching-service

## Source Plan
brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md

## Result
Needs Fix

## Findings
- [P1] The submitted API code does not typecheck in the changed verification helper. The API typecheck reports new errors in apps/api/src/db/queries/students.ts, including the Levenshtein matrix possibly undefined at lines 1102-1114, genderInferenceDetails inferred as only null at lines 1234 and 1241, fullMatch inferred as only null at line 1321, and suspectedMatches/results inferred as never[] at lines 1323-1339.
- [P1] The submitted dashboard consumer does not typecheck against its own import activity schema. apps/dashboard/src/components/modals/student-import/import-activities.tsx defines matches without isCurrentTermMatch, isCurrentClassroomMatch, confidence, or reason at lines 31-45, but reads those fields at lines 444, 446, 485, and 486.
- [P1] The selected classroom validation is not active-session scoped. apps/api/src/db/queries/students.ts lines 1141-1152 only check classRoom.schoolProfileId === profile.schoolId; they never validate the selected classroom department against ctx.profile.sessionId or ctx.profile.termId, even though the handoff requires validation against the active school/session.
- [P1] Match metadata is incomplete and one identifier is mislabeled. apps/api/src/db/queries/students.ts lines 1293-1318 derive activeSessionForm from candidate.termForms, then return that term-form id as studentSessionFormId. The response also omits an explicit studentTermFormId/termSheetId and sessionId, which the handoff requires and the UI needs before it can safely enroll/link matches.
- [P2] The required Brain feature documentation was not created. The handoff explicitly required brain/features/student-import.md with matching and gender inference rules, but that file is missing. The implementation also changed brain/api/permissions.md with unrelated staff-onboarding wording even though this handoff did not change permissions.

## Acceptance Criteria Check
- Verification runs through one backend request for the whole pasted batch: Pass
- Verification is tenant-scoped by ctx.profile.schoolId: Pass
- Selected classroom is validated against the active school/session: Fail
- Missing gender is inferred only when existing first-name samples are decisive: Pass
- Ambiguous or unavailable gender inference is flagged for manual resolution: Pass
- Full matches and suspected matches are distinct with confidence/reason metadata: Partial; data is attempted, but compile errors and UI schema omissions block consumption.
- Common typos can surface as suspected matches but are not automatically accepted as full matches: Pass
- Every match includes session, term, and class metadata for the review UI: Fail

## Checks
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-verification-and-matching-service --filter @school-clerk/api typecheck: Fail; includes touched-file errors in apps/api/src/db/queries/students.ts.
- bun --cwd /Users/M1PRO/Documents/code/.brain-worktrees/2026-06-12-school-clerk-student-import-verification-and-matching-service --filter @school-clerk/dashboard typecheck: Fail; includes touched-file errors in apps/dashboard/src/components/modals/student-import/import-activities.tsx.
- Manual verification cases: Not run because compile/type failures block approval.

## Brain Update Check
- brain/progress.md: Present
- brain/api/endpoints.md: Present
- brain/api/contracts.md: Present but should be tightened after metadata fixes
- brain/features/student-import.md: Missing
- brain/api/permissions.md: Changed without an auth/permission change in this handoff
- brain/tasks/in-progress.md: Present; task remains in progress

## Decision
The implementation adds the right broad surface, but it cannot be approved while changed API/dashboard code fails typecheck and core contract requirements are missing. A fix handoff was created to keep the repair small and auditable.

## Follow-Up
- brain/handoffs/fixes/2026-06-12-student-import-verification-and-matching-service-fix-1.md
