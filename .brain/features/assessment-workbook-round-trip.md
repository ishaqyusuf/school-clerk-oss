# Assessment Workbook Round Trip

## Goal

Let an authorized academic user download one School Clerk-generated `.xlsx` assessment form for one classroom and term, enter scores offline, review the upload against live records, resolve subject-only columns, and atomically apply safe changes without AI or label-based matching.

## Download

- Entry point: `Assessment Workbooks` in the authenticated Assessment Recording toolbar.
- One workbook is bound to one tenant, term, and classroom department.
- Users select one or many subjects and configure each subject independently:
  - one or more existing scoreable standalone/child assessments; or
  - one Bare Subject Column to resolve during import.
- Group assessment parents are never selectable or scoreable.
- Existing scores are included as the download snapshot.
- The visible sheet contains separate Boys and Girls sections. Any enrolled student without `Male` or `Female` gender blocks generation.
- Direction defaults from the scoped Academic Data Direction provider and can be overridden per download.

## Workbook Trust Contract

- `@school-clerk/assessment-workbooks` owns browser-safe schemas, literal-number normalization, three-way planning, and preview contracts.
- `@school-clerk/assessment-workbooks/server` owns ExcelJS generation/parsing and HMAC-SHA256 signing.
- The workbook has exactly:
  - protected visible `Assessment Form` sheet; and
  - `veryHidden` `__school_clerk` metadata sheet.
- Signed metadata contains version, export id, tenant, term, classroom, direction, generation time, stable student-term-form rows, stable department-subject/assessment columns, coordinates, and original scores.
- Visible labels are never used as identity.
- Upload rejects missing/altered signatures, unknown sheets/structure, exposed metadata, removed protection, formulas, macros, embedded executable content, external workbook links, archives over 10 MB, excessive ZIP entries, and excessive expanded size.
- Production requires `ASSESSMENT_WORKBOOK_SIGNING_SECRET`.

## Score Rules

- Blank cells are accepted and mean no change.
- Accepted literals use Western, Arabic-Indic, or Eastern Arabic-Indic digits with `.` or `٫` as the decimal separator.
- Percentages, exponent notation, grouping separators, negative values, formulas, words, non-finite values, and scores above the current obtainable maximum block apply.
- Comparison is three-way:
  - uploaded equals downloaded or current: unchanged;
  - current equals downloaded: create/update is safe;
  - current and uploaded diverged independently: conflict blocker.
- Newly enrolled students do not invalidate an older workbook.
- A stale transferred/deleted student row is ignored when all cells are blank and blocks when any cell is populated.

## Bare Subject Columns

- Review requires every Bare Subject Column to:
  - link to a currently scoreable assessment on the same department subject; or
  - create a standalone assessment with title, positive maximum obtainable, and weight defaulting to `0%`.
- Assessment creation is deferred until confirmation and occurs in the same transaction as score writes.
- Import never creates grouped assessments or sub-assessment hierarchies.

## Apply And Audit

- Preview is read-only and always precedes confirmation.
- Apply reparses the signed workbook, rechecks tenant/export binding and current teacher/admin access, reloads live scores, and rebuilds the plan inside a serializable transaction.
- Any blocker aborts the whole transaction.
- Safe score writes upsert the unique student + term-form + assessment record.
- `AssessmentWorkbookExport` persists issued workbook identity.
- `AssessmentWorkbookImport` persists an idempotency key, file digest, summary, created assessment ids, actor, and timestamps.
- Repeating the same idempotency key and file returns the stored outcome; using that key with another file is rejected.
- Download and successful import create tenant activity events.

## Out Of Scope

- AI parsing or matching.
- CSV, legacy, arbitrary, or manually created workbook import.
- Multiple classrooms or terms in one workbook.
- Unspecified-gender sections.
- Conflict override, partial apply, rollback UI, grouped-assessment creation, background jobs, or formulas.
