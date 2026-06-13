# Feature: Student Import

## Purpose

Allow school operators to import multiple students from pasted text data, assign the batch to one active-session classroom, verify rows against existing records, surface matches or suspected typo matches, resolve gender, and execute selected import/enrollment actions safely.

## User Flow

1. **Upload / Start Screen**:
   - Select **Target Classroom** (department) from the active academic session.
   - Optionally select **Global Gender** as a default fallback.
   - Paste student records into the textarea, one student per line.
   - Preview parsed row count and validation warnings.
2. **Verification & Matching**:
   - The parsed batch is verified against existing records to detect conflicts, duplicates, suspected typo matches, and missing gender.
3. **Review & Resolution**:
   - The user chooses per-row actions for matches or suspected matches.
4. **Execution**:
   - The batch mutation creates new students, keeps existing matches, or updates matched names.
   - Session and term sheets are created idempotently for the active classroom/session/term.

## Input Parsing Contract

Each pasted line is parsed as follows:

- The line is split by the first comma `,` into a **Name Part** and an optional **Gender Part**.
- The **Name Part** is trimmed and split by whitespace into tokens:
  - Token 1: `name` (first name)
  - Token 2: `surname` (family name)
  - Remaining tokens: `otherName` (middle or additional names)
- The **Gender Part** is matched against recognized aliases:
  - Male aliases: `Male`, `M`, `male`, `m`
  - Female aliases: `Female`, `F`, `female`, `f`
- **Gender assignment priority and schema**:
  1. Explicit row-level gender, stored as `parsedGender` internally.
  2. Selected global gender, only when no row-level gender is specified.
  3. Missing, to be inferred or resolved later, when neither row nor global gender is provided.

In the parsed output payload, `student.gender` is the effective input gender after row/global fallback, while `student.parsedGender` records only what was explicitly present on the individual line.

## UI Validation And Warnings

- Empty lines are ignored.
- Missing name parts are surfaced with line numbers.
- Missing surnames are surfaced as warnings.
- Unrecognized gender aliases are surfaced as warnings.
- Proceeding to the verification tab requires a valid classroom selection.

## Matching Rules

### Name Normalization

- Arabic text is stripped of tashkeel/diacritics (Unicode ranges `\u0610-\u061A`, `\u064B-\u065F`, `\u0670`, `\u06D6-\u06ED`, `\u08D3-\u08FF`, `\u0640`).
- Common Arabic letter variants are normalized: `أ`/`إ`/`آ`/`ٱ` -> `ا`, `ئ`/`ى` -> `ي`, `ة` -> `ه`.
- Normalized names are lowercased and trimmed.

### Exact Match

- Confidence: 100.
- Name and surname both match exactly after normalization.

### Typo / Suspected Match

- Levenshtein edit distance of `<= 2` on either name or surname, with the other field matching exactly.
- Confidence ranges: 80% for distance 0 on one field, 70% for distance 1, and 60% for distance 2.
- When both fields differ by `<= 2`, confidence is `60 - (nameDist + surnameDist) * 5`.

### Manual Resolution Cases

- Suspected matches with confidence `>= 70%` trigger a needs-attention status for operator review.
- Rows with no exact match and no high-confidence suspected match default to ready-to-import.

## Gender Inference

### Inference Rules

- If the imported row has no gender, the system consults a frequency map built from all existing students in the school.
- For a given normalized first name:
  - Requires at least 2 existing samples with that name.
  - If at least 80% of samples are male, infers `Male` with confidence equal to the male ratio.
  - If at least 80% of samples are female, infers `Female` with confidence equal to the female ratio.

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
| `studentTermFormId` | Current term form ID (the term sheet) |
| `studentSessionFormId` | Session form ID; currently null until enrollment creates it where needed |
| `termId`, `termName` | Active term |
| `sessionId`, `sessionName` | Active session |
| `isCurrentTermMatch` | Whether the student's term form matches the active term |
| `isCurrentClassroomMatch` | Whether the student's term form matches the selected classroom |
| `confidence` | Match confidence, 0-100 |
| `reason` | Human-readable match reason |

## Batch Execution

### Endpoint

- `trpc.students.verifyStudentImport`: single-query batch verification with classroom scoping, edit-distance matching, and gender inference.
- `trpc.students.executeStudentImport`: batch mutation for row-level import decisions.

### Execute Input Schema

```ts
{
  classroomDepartmentId: string;
  rows: {
    lineNumber: number;
    name: string;
    surname: string;
    otherName?: string | null;
    gender: "Male" | "Female";
    action: "import_new" | "keep_match" | "update_match_with_name";
    existingStudentId?: string | null;
  }[];
}
```

### Execute Result Schema

```ts
{
  createdStudents: number;
  keptMatches: number;
  updatedMatches: number;
  termSheetsCreated: number;
  skippedRows: number;
  failedRows: number;
  rows: {
    lineNumber: number;
    action: string;
    status: "created" | "kept" | "updated" | "skipped" | "failed";
    studentId?: string | null;
    termSheetCreated?: boolean;
    reason?: string;
  }[];
}
```

### Row Actions

| Action | Behavior |
|--------|----------|
| `import_new` | Creates a new `Students` record with `StudentSessionForm` and `StudentTermForm`. Applies fee histories. |
| `keep_match` | Validates the existing student exists in the tenant. Creates session/term forms idempotently if missing. Does not modify student identity. |
| `update_match_with_name` | Updates matched student's name/surname/otherName, then acts like `keep_match` for forms. |

### Term Sheet Creation

- Checks for any non-deleted `StudentTermForm` for the same student, active session, and active term.
- If one exists in the same classroom, it is reused without duplicate creation.
- If one exists in a different classroom, the row fails with the conflicting classroom name.
- If none exists, the system creates `StudentSessionForm` when needed, then creates `StudentTermForm`, then applies fee histories.

### Dashboard Invalidation

After successful execution, the dashboard invalidates:

- `students.index`
- `students.analytics`
- `students.studentsRecentRecord`
- `classrooms.all`

Report-sheet and finance query keys are parameterized per classroom/student and refresh on navigation. See `brain/api/contracts.md` for the full invalidation notes.

## Files

- `apps/api/src/db/queries/students.ts`: `verifyStudentImport`, `executeStudentImport`, and student import helpers.
- `apps/api/src/trpc/routers/students.routes.ts`: tRPC wiring.
- `apps/dashboard/src/components/modals/student-import/index.tsx`: input parsing and classroom/global gender start screen.
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`: review, resolution, and execution UI.

## Implementation Plans

- `brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md`
- `brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md`
- `brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md`
- `brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md`

## Brain Docs To Keep Updated

- `brain/api/contracts.md`
- `brain/api/endpoints.md`
- `brain/database/relationships.md`
