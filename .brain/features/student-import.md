# Feature: Student Import

## Purpose

Allow school operators to import multiple students from pasted text data, assign rows to one or more active-session classrooms, verify rows against existing records, surface matches or suspected typo matches, resolve gender, and execute selected import/enrollment actions safely.

## User Flow

1. **Upload / Start Screen**:
   - Select an **Import Mode**:
     - **Single** requires a classroom from the active academic session and assigns every parsed row to that classroom.
     - **Multiple** enables raw classroom-header parsing and uses the selected classroom only as a fallback for rows outside a resolved header section.
   - Select a classroom/default classroom from the active academic session according to the selected mode.
   - Optionally select **Global Gender** as a default fallback.
   - Paste student records into the textarea, one student per line, or use raw class-name section headers for multi-classroom imports.
   - Preview parsed row count, pasted line count, and the number of lines that need review in the sticky setup footer.
2. **Verification & Matching**:
   - The parsed batch is verified against existing records to detect conflicts, duplicates, suspected typo matches, and missing gender.
3. **Review & Resolution**:
   - The user clicks **Proceed** to open a single scrollable review surface grouped into `Needs attention`, `Match found`, and `Ready to import` table sections.
   - Exact matches default to `Keep match`; suspected matches require an explicit action and only require a selected candidate when the action targets an existing student.
   - Batch defaults are available for ready rows, exact matches, and suspected matches while preserving row-level overrides.
   - Checked rows drive the review footer counts and execution readiness. Rows are checked by default, but unchecked attention rows do not block importing checked rows that are already executable.
4. **Execution**:
   - Each row can be imported individually, or selected rows can be imported as a batch.
   - The execution mutation creates new students, keeps existing matches, or updates matched names.
   - Session and term sheets are created idempotently for each row's target classroom/session/term.

## Input Parsing Contract

Each pasted line is parsed as follows:

- In **Multiple** import mode, a line that exactly matches a current-session classroom display label becomes a class section header. Following student rows use that classroom until the next class section header.
- In **Single** import mode, classroom label parsing is disabled and the selected classroom is required before proceeding.
- Supported classroom label forms include the combined class/department display, department name when unique, class name when unique, and class plus department words normalized with all whitespace ignored and dash/separator variants removed.
- If a classroom label matches more than one current-session classroom, it becomes an unresolved classroom section instead of a student row. Following student rows remain in `Needs attention` until the operator assigns the correct classroom manually; the default fallback classroom does not silently resolve ambiguous sections.
- Parsed rows carry `classroomResolutionStatus` as `resolved`, `missing`, or `ambiguous`, alongside `classroomSource`, so review and verification can distinguish fallback-eligible missing rows from ambiguous rows that require explicit manual assignment.
- When a class header is read, the active batch gender resets to unset.
- A line that exactly matches `M`, `Male`, `F`, `Female`, `M | Male`, or `F | Female` becomes a batch-gender marker for following student rows in the active class section.
- Batch gender applies only when the student row does not have an explicit row-level gender.
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
  2. Active batch-gender marker from the current pasted section, stored as `batchGender` internally.
  3. Selected global gender, only when no row-level or batch gender is specified.
  4. Missing, to be inferred or resolved later, when no row, batch, or global gender is provided.

In the parsed output payload, `student.gender` is the effective input gender after row/global fallback, while `student.parsedGender` records only what was explicitly present on the individual line.

### Multi-Classroom Paste Example

```text
JSS 1 - A
M | Male
John Doe
Yusuf Ahmad

F | Female
Maryam Bello

JSS 2 - B
Fatima Lawal, F
Musa Garba, M
```

## UI Validation And Warnings

- Empty lines are ignored.
- Missing name parts are surfaced with line numbers.
- Missing surnames are surfaced as warnings.
- Proceeding to the verification tab requires at least one parsed student row. Rows without a raw class header use the selected default classroom when available; otherwise they are surfaced as needing classroom attention before execution.
- The optional global gender and manual row gender resolution use compact grouped `M` / `F` controls mapped to canonical `Male` / `Female` values.
- The import setup screen is intentionally quiet: a compact horizontal defaults form for import mode, classroom/default classroom, and global gender sits above the paste textarea.
- The setup footer summarizes readiness, parsed students, pasted lines, and lines needing fixes, then exposes the single **Proceed** action. Detailed parser warnings stay collapsed until the operator expands them.

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

### Sectioned Review

- **Needs attention**: rows that still need a required manual value, such as classroom, gender, or a match decision. No-match rows still default to `Import new` so they become executable as soon as missing classroom/gender values are resolved.
- **Match Found**: rows with exact or suspected existing-student matches and a resolved classroom. Exact matches default to `Keep match`; suspected matches start unresolved unless a batch default or row action is selected.
- **Ready to import**: rows with no existing match, a resolved classroom, and complete required fields. These default to `Import new`, and the section includes an `Import checked` batch action for checked, untouched rows.
- Review sections render in one scrollable body instead of separate tabs. Only sections with rows are shown, and each visible section has its own header, row count, checked count, and local check/uncheck-all controls.

### Batch And Row Decisions

- Exact-match and suspected-match batch defaults only apply to rows the operator has not touched.
- Each import row has a checkbox. Batch execution sends only checked rows; unchecked rows are omitted before validation and execution.
- Each review row exposes an `Import row` action. It validates and executes only that row through the same `executeStudentImport` contract used by batch import, then marks the row imported so it cannot be submitted twice while the remaining staged rows stay intact.
- Each review section exposes local check/uncheck-all controls for the rows visible in that section.
- `Keep match` and `Update match with name` require a selected candidate before execution.
- `Import new` and `Skip` are complete decisions for suspected-match rows and do not require selecting an existing candidate.
- `Skip` is a dashboard-only review action for matched or attention rows. It is disabled for no-match rows so ready imports cannot be accidentally omitted. Skipped rows are omitted from the `executeStudentImport` payload and counted in the review summary.
- Exact-match rows set to `Keep match` are automatically skipped when the matched student already has a current term sheet, because there is no import or enrollment work left to perform. If every checked row is skipped, the dashboard completes the import locally with a skipped-only summary instead of queuing an empty background job or showing an error.
- Review rows display parsed `name`, `surname`, `otherName`, and compact `M` / `F` gender controls in one line. Name part badges omit field labels, show `-` when `otherName` is empty, and auto-switch the name line to RTL when Arabic script is detected.
- Review rows include a per-row classroom selector. Choosing a classroom updates that row's target `classroomDepartmentId`, reruns verification/matching with the new target, and moves the row out of the attention tab once the classroom and other required values are resolved.
- The review and execution panels show a classroom scope summary with total, checked, executable, and attention counts per classroom so multi-classroom batches can be scanned without opening every row.
- Review row name parts are clickable dropdown controls. Before a row is edited, each part can choose from the full set of contiguous name-token combinations. After a selection, only the explicitly selected span is treated as taken and removed from the other part dropdowns; adjacent fields that were auto-adjusted remain available until the operator selects them. A reset control appears to clear the edited split. Selecting a possible name/surname/other-name combination recalculates the adjacent name fields from the original pasted tokens before execution, then locally re-checks existing students and surfaces an approvable suggested match when the edited name aligns with an existing record.
- Review rows include a search control for finding existing students. When the search field is empty, the dropdown recommends existing students ranked by the import row's parsed name parts. Selecting a student normalizes the import row to that student's stored name fields and exposes a `Move to match found` action that treats the selected student as the row's match.
- Review rows use a compact table-like layout with a checkbox column, a small line-number column, parsed-name/status column, closest-match column, selected action dropdown, and overflow menu for row-level utilities.
- Review rows show per-row classroom badges only when the current import spans more than one classroom; single-classroom imports keep the row metadata quieter.
- The closest-match column shows the selected or strongest candidate with confidence and a `+N more` indicator. Opening it reveals a popover of match candidates with metadata and selection actions.
- The overflow menu exposes secondary row actions such as searching existing students, resetting the name structure, skipping eligible rows, and importing one row.
- The import modal uses a fixed viewport height; modal headers, setup defaults, review command center, and footer remain stable while the setup/review body is the only scrollable surface.
- The review command center presents fallback classroom, refresh/cancel actions, checked/executable/skipped/attention counts, classroom scope badges, and the batch execute action in a responsive toolbar. Batch execution is disabled only when checked rows still have blockers or no checked executable rows remain.
- The execute action shows the selected/executable row count before import. During execution and completion, the classroom controls, execute action, tabs, and review rows are hidden so the operator focuses on the import status. The import analysis panel appears during import or after a completed import; it summarizes new students created, term sheets created, existing students kept without name changes, matched names updated, skipped rows, and failed rows with line-level failure reasons in a three-column analytics grid. Pre-submit or mutation-blocking errors appear as compact dismissible alerts above the review tabs so operators can keep resolving row contents. Completed imports show `Start new import` and `Close` actions below the analysis card.
- Execution and completion summaries use standard progress/status styling, responsive metric cards, classroom breakdown badges, failed-line analysis, and clear `Start new import` / `Close` actions.
- Verification, batch execution, and single-row execution errors are normalized before display. If the dashboard receives an HTML/non-JSON response instead of tRPC JSON, the modal shows a recoverable `Import needs attention` message, keeps the last successful staged review data, and includes only safe diagnostics such as operation, HTTP status, content type, and a short redacted response preview.
- `Cancel Import` is available before execution and returns the operator to the initial import screen, clearing staged verification/review state without writing new student records.
- The import review component only runs verification, recent-record reads, and job polling while the import tab is active. Recovered background jobs are only shown when there is no current staged paste payload, so an old pending/recent job cannot hijack a fresh review session or keep polling from hidden modal state.

### Candidate Metadata

The match UI exposes each candidate's display name and confidence by default. It adds classroom metadata only when the candidate is in a different class and adds a term-sheet badge only when a current term sheet exists, so same-class/no-term candidates stay visually quiet.

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
- `trpc.students.verifyStudentImport`: single-query batch verification with row-level classroom scoping, edit-distance matching, and gender inference.
- `trpc.students.verifyStudentImportBatch`: POST-backed verification mutation with the same input/output as `verifyStudentImport`, used by the dashboard modal so large pasted batches are not constrained by query URL length.
- `trpc.students.executeStudentImport`: mutation for row-level import decisions. The dashboard uses it for both selected-row batch import and one-row import actions.
- `trpc.students.startStudentImportJob`: mutation used by the dashboard batch execute action to create a persisted background import job from reviewed executable rows.
- `trpc.students.getStudentImportJob`: query used by the dashboard to recover active/recent import job progress and final row results.
- Batch imports always run through the Trigger.dev `process-student-import-job` task. The server creates the tenant-scoped job rows, calls the Trigger SDK `tasks.trigger(...)` function with the task id, stores the Trigger run id, and returns a scoped public run token so the dashboard can subscribe with `useRealtimeRun`.
- If the Trigger run reports `PENDING_VERSION`, the import job has been created but no matching worker version is available for that Trigger environment. Local development should use a Trigger.dev development secret key with `trigger.dev dev`; production keys require a deployed production worker.

### Execute Input Schema

```ts
{
  classroomDepartmentId?: string | null;
  rows: {
    lineNumber: number;
    name: string;
    surname: string;
    otherName?: string | null;
    gender: "Male" | "Female";
    classroomDepartmentId?: string | null;
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

- Checks for any non-deleted `StudentTermForm` for the same student, active session, active term, and row target classroom.
- If one exists in the same classroom, it is reused without duplicate creation.
- If one exists in a different classroom, the row fails with the conflicting classroom name.
- If none exists, the system creates `StudentSessionForm` when needed, then creates `StudentTermForm`, then applies fee histories.
- `import_new` rows are blocked when an exact normalized `name + surname + otherName` duplicate already exists in the row target classroom for the active term. Operators should keep/update the existing match or resolve the duplicate group first instead of creating another copy.

### Dashboard Invalidation

After successful direct single-row execution or completed background job execution, the dashboard invalidates:

- `students.index`
- `students.analytics`
- `students.studentsRecentRecord`
- `classrooms.all`

Report-sheet and finance query keys are parameterized per classroom/student and refresh on navigation. See `brain/api/contracts.md` for the full invalidation notes.

## Async Import Jobs

- Large selected-row batch execution is durable: the dashboard creates a `StudentImportJob` and queues the `process-student-import-job` Trigger.dev task instead of waiting for every row inside one HTTP request.
- Job rows persist the reviewed execution payload per line number, including row-level classroom, resolved gender, selected action, and selected existing student id.
- The worker processes pending rows in bounded 25-row chunks and reuses the same `executeStudentImport` business path for each row, preserving duplicate checks, matched-student validation, term-sheet creation/reuse, current-term classroom conflict handling, and fee-history application. Aggregate progress counters are refreshed after each chunk.
- Completed job rows are final for retry/resume purposes. A retry only processes pending/running rows and recomputes aggregate counters from persisted row results so completed rows are not double-counted.
- Job status values are `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_FAILURES`, `FAILED`, and `CANCELLED`.
- Row status values are `PENDING`, `RUNNING`, `CREATED`, `KEPT`, `UPDATED`, `SKIPPED`, and `FAILED`.
- The dashboard progress panel shows processed/total rows, created students, kept matches, updated matches, term sheets created, skipped rows, failed rows, and failed-line reasons. It polls persisted job state and can reopen an active or recent job after refresh/modal reopen.

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
