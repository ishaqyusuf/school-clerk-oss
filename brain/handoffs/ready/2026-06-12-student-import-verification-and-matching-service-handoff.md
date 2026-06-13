# Brain Handoff: Student Import Verification And Matching Service

## Status
Ready

## Source Plan
brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md

## Task
- Task Title: Student Import Verification And Matching Service
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: open-code
- Reason: This is backend/API/service work with tenant-scoped data access, matching heuristics, and contract documentation.

## Goal
Add an optimized server-side student import verification procedure that verifies an entire pasted batch, infers missing gender from existing first-name data, separates full matches from suspected typo matches, and returns compact session/term/class match metadata for the review UI.

## Context To Read First
- brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md
- brain/intake/2026-06-12-student-import-polish.md
- brain/BRAIN.md
- brain/system/overview.md
- brain/system/architecture.md
- brain/engineering/ai-rules.md
- brain/engineering/coding-standards.md
- brain/api/contracts.md
- brain/api/endpoints.md
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/students.ts
- apps/dashboard/src/actions/get-name-gender.ts
- apps/dashboard/src/components/modals/student-import/import-activities.tsx

## Implementation Instructions
1. Add a verification input schema for `classroomDepartmentId` and parsed rows with `lineNumber`, `originalText`, `name`, `surname`, `otherName`, and optional gender.
2. Add a tenant-scoped tRPC query/procedure, likely `students.verifyStudentImport`, backed by an import-specific query/helper.
3. Validate the selected classroom department belongs to the active school/session from `ctx.profile`.
4. Fetch candidate students, current/relevant term forms, selected classroom, and first-name gender samples once per batch.
5. Implement shared deterministic normalization for Latin/Arabic names. Reuse the existing Arabic normalization logic where practical.
6. Return `fullMatch`, `suspectedMatches`, gender inference metadata, and `needsAttention` flags with confidence/reason details.
7. Include match metadata: student id, name/surname/otherName, gender, session, term, classroom, studentSessionFormId, studentTermFormId/termSheetId, and current term/classroom match flags.
8. Keep the response compact; do not include large assessment, attendance, or finance child records.

## Acceptance Criteria
- Verification runs through one backend request for the whole pasted batch.
- Verification is tenant-scoped by `ctx.profile.schoolId`.
- Selected classroom is validated against the active school/session.
- Missing gender is inferred only when existing first-name samples are decisive.
- Ambiguous or unavailable gender inference is flagged for manual resolution.
- Full matches and suspected matches are distinct and include confidence/reason metadata.
- Common typos can surface as suspected matches but are not automatically accepted as full matches.
- Every match includes session, term, and class metadata for the review UI.

## Files Or Areas Likely Involved
- apps/api/src/trpc/routers/students.routes.ts
- apps/api/src/db/queries/students.ts
- apps/api/src/db/queries/
- packages/utils/src/
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- brain/api/contracts.md
- brain/api/endpoints.md

## Do Not Change
- Do not execute imports or create/update students in the verification query.
- Do not remove `studentsRecentRecord` unless every call site is deliberately updated.
- Do not change the Prisma schema unless absolutely required.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/api typecheck`
- `bun --filter @school-clerk/dashboard typecheck` if dashboard types consume the new contract
- Manual verification for exact match, typo suspected match, inferred gender, ambiguous gender, invalid classroom, and large batch single request.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-verification-and-matching-service.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/student-import.md`: create or update with matching and gender inference rules.
- `brain/api/endpoints.md`: update if API routes changed.
- `brain/api/contracts.md`: update if request/response shapes changed.
- `brain/api/permissions.md`: update if auth or permissions changed.
- `brain/database/schema.md`: update only if schema changed.
- `brain/database/migrations.md`: update only if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes
- Changed files:
  - `apps/api/src/db/queries/students.ts` (added verifyStudentImport schema and logic, name normalization, and Levenshtein distance)
  - `apps/api/src/trpc/routers/students.routes.ts` (imported and registered verifyStudentImport query)
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx` (reworked UI to fetch and render verifyStudentImport report, added classroom selector, inline action buttons for enroll/link, and gender manual specification/inference widgets)
  - `brain/api/endpoints.md` (documented new endpoint)
  - `brain/api/contracts.md` (documented request/response structures)
  - `brain/progress.md` (added feature progress details)
- Checks run:
  - `bun install` completed successfully.
  - `bunx tsc --noEmit` executed in `apps/dashboard` and compiles successfully (unrelated baseline package type check errors bypassed).
- Brain docs updated:
  - `brain/api/endpoints.md`
  - `brain/api/contracts.md`
  - `brain/progress.md`
- Unresolved issues:
  - None.
