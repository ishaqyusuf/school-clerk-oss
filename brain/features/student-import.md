# Feature: Student Import

## Purpose

Import batches of students from pasted text data, verify them against existing records, and surface matches, suspected typo matches, and gender inference results for operator review.

## Matching Rules

### Name Normalization
- Arabic text is stripped of tashkeel/diacritics (Unicode ranges \u0610-\u061A, \u064B-\u065F, \u0670, \u06D6-\u06ED, \u08D3-\u08FF, \u0640).
- Common Arabic letter variants are normalized: أ/إ/آ/ٱ → ا, ئ/ى → ي, ة → ه.
- Normalized names are lowercased and trimmed.

### Exact Match
- Confidence: 100.
- Name AND surname both match exactly after normalization.

### Typo / Suspected Match
- Levenshtein edit distance of ≤ 2 on either name or surname (with the other field matching exactly).
- Confidence ranges: 80% (distance 0 on one field), 70% (distance 1), 60% (distance 2).
- When both fields differ by ≤ 2, confidence = 60 - (nameDist + surnameDist) × 5.

### Manual Resolution Cases
- Suspected matches with confidence ≥ 70% trigger a "needs attention" status for operator review.
- Rows with no exact match and no high-confidence suspected match default to "ready to import" (treated as new students).

## Gender Inference

### Inference Rules
- If the imported row has no gender, the system consults a frequency map built from all existing students in the school.
- For a given normalized first name:
  - Requires ≥ 2 existing samples with that name.
  - If ≥ 80% of samples are male → infers Male with confidence = maleRatio%.
  - If ≥ 80% of samples are female (≤ 20% male) → infers Female with confidence = (1 - maleRatio)%.

### Manual Resolution
- If no decisive threshold is met, the row is flagged `needsGender: true` and the operator must select gender manually before import.

## Match Metadata Returned

Each match (`fullMatch` or `suspectedMatches[]`) includes:

| Field | Description |
|-------|-------------|
| `id` | Student ID |
| `name`, `surname`, `otherName` | Student name fields |
| `gender` | Student gender |
| `classRoom` | Classroom department display name |
| `classroomDepartmentId` | Classroom department ID |
| `studentTermFormId` | Current term form ID (the "term sheet") |
| `studentSessionFormId` | Session form ID (null in current implementation — enrollment creates if needed) |
| `termId`, `termName` | Active term |
| `sessionId`, `sessionName` | Active session |
| `isCurrentTermMatch` | Whether the student's term form matches the active term |
| `isCurrentClassroomMatch` | Whether the student's term form matches the selected classroom |
| `confidence` | Match confidence (0-100) |
| `reason` | Human-readable match reason |

## API Endpoint

- `trpc.students.verifyStudentImport` — single-query batch verification with classroom scoping, edit-distance matching, and gender inference.

## Files

- `apps/api/src/db/queries/students.ts`: `verifyStudentImport` function
- `apps/api/src/trpc/routers/students.routes.ts`: tRPC wiring
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`: Review UI

## Implementation Plans

- `brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md`
- `brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md`
- `brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md`
- `brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md`
