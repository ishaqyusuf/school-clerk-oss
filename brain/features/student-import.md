# Feature: Student Import

## Purpose

Imports batches of students from text data, matches them against existing records, and applies selected resolutions (create new, keep match, or update match with name) in a single batch mutation.

## Scope

- Parse student names, surnames, genders, and classroom assignments from raw text input.
- Match imported students against existing records with Arabic-aware normalization.
- Execute batch import decisions: create new students, keep matched students, update matched names.
- Create active term sheets (StudentSessionForm + StudentTermForm) idempotently for kept/updated matches.
- Apply fee histories to newly created term sheets.

## Implemented Behavior

### Input Parsing
- Raw text input is split by newlines, then by comma-delimited fields.
- Gender is a parsed field per student row; classroom is detected by standalone lines containing only a classroom name.
- The parsed output includes `name`, `surname`, `otherName`, `gender`, and `classRoom` per student.

### Name Matching
- Arabic normalization: removes tashkeel/diacritics, normalizes letter variants (أ→ا, ى→ي, etc.).
- Exact matches: same first name + surname.
- Partial matches: same first name OR surname.
- Classroom matching: matches against `classRoomDepartment.departmentName`.

### Batch Execution (`students.executeStudentImport`)

Input schema:
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

Result schema:
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
| `keep_match` | Validates the existing student exists in the tenant. Creates session/term forms idempotently if missing. Does NOT modify student identity. |
| `update_match_with_name` | Updates matched student's name/surname/otherName. Then acts like `keep_match` for forms. |

### Term Sheet Creation (Idempotent)
- Checks for any non-deleted `StudentTermForm` for the same student + active session + active term.
- If one exists in the same classroom: reused without modification (no duplicate created).
- If one exists in a different classroom: returns a row-level failure with the conflicting classroom name — no duplicate is created.
- If none exists: creates `StudentSessionForm` (if needed) and `StudentTermForm`, then applies fee histories.

### Validation
- Requires `ctx.profile.schoolId`, `sessionId`, and `termId`.
- Validates classroom belongs to active school.
- Validates existing student IDs belong to active tenant.
- Reports failures per-row without blocking successful rows.

### Dashboard Invalidation
After successful execution, invalidates:
- `students.index`
- `students.analytics`
- `students.studentsRecentRecord`
- `classrooms.all`

Report-sheet and finance query keys are parameterized per-classroom/per-student and refresh on navigation. See `brain/api/contracts.md` for the full invalidation list.

## Files

- `apps/api/src/db/queries/students.ts`: `executeStudentImport` mutation + `createTermSheetIfMissing` helper
- `apps/api/src/trpc/routers/students.routes.ts`: tRPC wiring
- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`: UI batch execution + results display
- `apps/dashboard/src/components/modals/student-import/index.tsx`: Modal wrapper with text parsing

## Implementation Plans

- `brain/plans/2026-06-12-feature-student-import-input-and-name-parsing.md`
- `brain/plans/2026-06-12-feature-student-import-verification-and-matching-service.md`
- `brain/plans/2026-06-12-feature-student-import-review-and-resolution-ui.md`
- `brain/plans/2026-06-12-feature-student-import-execution-and-term-sheet-creation.md`

## Brain Docs To Keep Updated

- `brain/api/contracts.md`
- `brain/api/endpoints.md`
- `brain/database/relationships.md`
