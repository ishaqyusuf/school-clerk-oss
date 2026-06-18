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
   - The user reviews rows in `Ready to import`, `Match Found`, and `Needs attention` tabs.
   - Exact matches default to `Keep match`; suspected matches require an explicit action and only require a selected candidate when the action targets an existing student.
   - Batch defaults are available for ready rows, exact matches, and suspected matches while preserving row-level overrides.
4. **Execution**:
   - The batch mutation creates new students, keeps existing matches, or updates matched names.
   - Session and term sheets are created idempotently for the active classroom/session/term.

## Input Parsing Contract

Each pasted line is parsed as follows:

- If the line contains comma `,`, Arabic comma `،`, or dot `.` delimiters, the line is split on those delimiters, trimmed, and empty parts are ignored.
- If the final comma/dot-delimited part is a recognized gender alias, that final part becomes the row-level gender and the preceding parts remain the name source.
- If explicit name delimiters are not present, the parser fetches a tenant-scoped import name guide from existing student `name`, `surname`, and `otherName` values, trims and deduplicates the list, and greedily matches the longest known name part before falling back to whitespace tokens.
- The guided fallback uses the same Arabic normalization family as import verification, including tashkeel removal and common Arabic letter variants, so known multi-word Arabic name parts are not split only because they contain spaces.
- If the name source has only one part before a recognized row-level gender, that one part also uses the guided fallback so `John Doe, Male` and `عبد الله محمد، M` still map correctly.
- The resulting name tokens are assigned deterministically:
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
- Proceeding to the verification tab requires a valid classroom selection.
- The optional global gender and manual row gender resolution use compact grouped `M` / `F` controls mapped to canonical `Male` / `Female` values.

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

## Review And Resolution UI

### Tabs

- **Ready to import**: rows with no existing match and complete required fields. These default to `Import new`, and the tab includes an `Import checked` batch action for checked, untouched rows.
- **Match Found**: rows with exact or suspected existing-student matches. Exact matches default to `Keep match`; suspected matches start unresolved unless a batch default or row action is selected.
- **Needs attention**: rows that are not matched but still need a required manual value, such as gender. No-match rows still default to `Import new` so they become executable as soon as the missing gender is resolved.

### Batch And Row Decisions

- Exact-match and suspected-match batch defaults only apply to rows the operator has not touched.
- Each import row has a checkbox. Batch execution sends only checked rows; unchecked rows are omitted before validation and execution.
- Each review tab exposes local check/uncheck-all controls for the rows visible in that tab.
- `Keep match` and `Update match with name` require a selected candidate before execution.
- `Import new` and `Skip` are complete decisions for suspected-match rows and do not require selecting an existing candidate.
- `Skip` is a dashboard-only review action for matched or attention rows. It is disabled for no-match rows so ready imports cannot be accidentally omitted. Skipped rows are omitted from the `executeStudentImport` payload and counted in the review summary.
- Review rows display parsed `name`, `surname`, and `otherName` as separate editable fields.
- Review row name parts are clickable dropdown controls. Before a row is edited, each part can choose from the full set of contiguous name-token combinations. After a selection, only the explicitly selected span is treated as taken and removed from the other part dropdowns; adjacent fields that were auto-adjusted remain available until the operator selects them. A reset control appears to clear the edited split. Selecting a possible name/surname/other-name combination recalculates the adjacent name fields from the original pasted tokens before execution, then locally re-checks existing students and surfaces an approvable suggested match when the edited name aligns with an existing record.
- Review rows include a search control for finding existing students. When the search field is empty, the dropdown recommends existing students ranked by the import row's parsed name parts. Selecting a student normalizes the import row to that student's stored name fields and exposes a `Move to match found` action that treats the selected student as the row's match.
- Review rows use a compact card layout with a status header, parsed-name fields, row actions, existing-student search, and match candidates separated into clear scan areas. The original pasted line is no longer shown in each row.
- The import modal uses a fixed viewport height; modal headers, classroom/action controls, and tab selectors remain stable while the active tab body is the only scrollable review surface.
- The execute action shows the selected/executable row count before import. During execution and completion, the classroom controls, execute action, tabs, and review rows are hidden so the operator focuses on the import status. The import analysis panel appears during import or after a completed import; it summarizes new students created, term sheets created, existing students kept without name changes, matched names updated, skipped rows, and failed rows with line-level failure reasons in a three-column analytics grid. Pre-submit or mutation-blocking errors appear as compact dismissible alerts above the review tabs so operators can keep resolving row contents. Completed imports show `Start new import` and `Close` actions below the analysis card.
- `Cancel Import` is available before execution and returns the operator to the initial import screen, clearing staged verification/review state without writing new student records.

### Candidate Metadata

The match UI exposes each candidate's display name, classroom, current term-sheet status, same-classroom status, and confidence so operators can resolve exact and suspected matches without leaving the modal. Current term-sheet and same-classroom badges are green for matching/current records and red when missing or different.

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

| Field                          | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `id`                           | Student ID                                                               |
| `name`, `surname`, `otherName` | Student name fields                                                      |
| `gender`                       | Student gender                                                           |
| `classRoom`                    | Classroom department display name                                        |
| `classroomDepartmentId`        | Classroom department ID                                                  |
| `studentTermFormId`            | Current term form ID (the term sheet)                                    |
| `studentSessionFormId`         | Session form ID; currently null until enrollment creates it where needed |
| `termId`, `termName`           | Active term                                                              |
| `sessionId`, `sessionName`     | Active session                                                           |
| `isCurrentTermMatch`           | Whether the student's term form matches the active session and term      |
| `isCurrentClassroomMatch`      | Whether the student's term form matches the selected classroom           |
| `confidence`                   | Match confidence, 0-100                                                  |
| `reason`                       | Human-readable match reason                                              |

## Batch Execution

### Endpoint

- `trpc.students.getImportNameGuide`: compact tenant-scoped existing-name guide for whitespace-only import parsing.
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

| Action                   | Behavior                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `import_new`             | Creates a new `Students` record with `StudentSessionForm` and `StudentTermForm`. Applies fee histories.                                    |
| `keep_match`             | Validates the existing student exists in the tenant. Creates session/term forms idempotently if missing. Does not modify student identity. |
| `update_match_with_name` | Updates matched student's name/surname/otherName, then acts like `keep_match` for forms.                                                   |
| `skip`                   | Dashboard-only review action. Excludes the row from the execution payload.                                                                 |

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
- `apps/dashboard/src/components/modals/student-import/index.tsx`: classroom/global gender start screen and import guide fetch.
- `apps/dashboard/src/components/modals/student-import/parser.ts`: input parsing, delimiter handling, and Arabic-aware guided fallback.
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
