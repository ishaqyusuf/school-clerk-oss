# Brain Handoff: Student Import Input And Name Parsing

## Status
Ready

## Source Plan
brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md

## Task
- Task Title: Student Import Input And Name Parsing
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: This is a dashboard modal/product-flow change with form controls, parser feedback, and manual UI verification.

## Goal
Update the student import start screen so operators paste one student per line, select one current-session classroom, optionally select a global gender, and proceed with stable parsed `name`/`surname`/`otherName` rows instead of the current classroom-in-line parsing behavior.

## Context To Read First
- brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md
- brain/intake/2026-06-12-student-import-polish.md
- brain/BRAIN.md
- brain/system/overview.md
- brain/system/architecture.md
- brain/engineering/ai-rules.md
- brain/engineering/coding-standards.md
- apps/dashboard/src/components/modals/student-import/index.tsx
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- apps/dashboard/src/components/forms/student-form.tsx

## Implementation Instructions
1. Rework `StudentImportModal` so the initial form has a current-session classroom/classroom department select, optional global gender select, and the existing paste area.
2. Replace the inline comma parser with an isolated deterministic parser helper that preserves `lineNumber`, `originalText`, parsed `name`, `surname`, `otherName`, row gender, effective input gender, and warnings.
3. Support `Student Name`, `Student Name, Male`, `Student Name, Female`, and aliases `M`/`F`/case variants.
4. Apply global gender only when a row has no explicit gender. Leave gender missing when neither row nor global gender is provided.
5. Split names transparently: first token to `name`, second token to `surname`, remaining tokens to `otherName`; preserve original text for review.
6. Require a classroom selection before moving to verification/import activity.
7. Keep raw text local-storage persistence. Do not persist extra fields unless it follows existing local UI patterns cleanly.
8. Remove the current behavior where a one-field line changes classroom context.

## Acceptance Criteria
- The import modal accepts one student per non-empty line.
- Classroom is selected once from current-session classroom departments before verification.
- Global gender is optional and applies only to rows without an explicit gender.
- Explicit row gender overrides global gender.
- Rows with no row/global gender remain missing for later backend inference.
- Parsed preview/report data includes `firstName`/`name`, `surName`/`surname`, and `otherName`.
- Invalid or empty lines are surfaced with line numbers and do not crash the modal.
- Existing raw text local storage behavior remains usable.

## Files Or Areas Likely Involved
- apps/dashboard/src/components/modals/student-import/index.tsx
- apps/dashboard/src/components/modals/student-import/import-activities.tsx
- apps/dashboard/src/components/forms/student-form.tsx
- apps/dashboard/src/components/classroom-header.tsx
- apps/dashboard/src/hooks/use-local-storage.ts

## Do Not Change
- Do not implement fuzzy matching or batch execution in this handoff.
- Do not change the Prisma student schema.
- Do not move the task to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- `bun --filter @school-clerk/dashboard typecheck`
- Manual parser checks for no gender, explicit gender, aliases, multiple names, blank lines, extra whitespace, and missing classroom.

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-student-import-input-and-name-parsing.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/student-import.md`: create or update with the new input contract if behavior changed.
- `brain/api/endpoints.md`: update only if API routes changed.
- `brain/api/contracts.md`: update only if request/response shapes changed.
- `brain/api/permissions.md`: update only if auth or permissions changed.
- `brain/database/schema.md`: update only if schema changed.
- `brain/database/migrations.md`: update only if migrations changed.
- `brain/decisions/`: add an ADR only if an architecture decision was made.
- `brain/tasks/in-progress.md`: keep the task in progress.

Do not move the task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:
