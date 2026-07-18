# Wayfinder Map: Assessment Workbook Round Trip

Labels: `wayfinder:map`
Status: Implemented

## Destination

An implementation-ready plan for a deterministic, AI-free Assessment Workbook feature library. Authorized users can download one signed, term-bound classroom workbook with configurable subjects and assessment columns, enter or correct scores offline in LTR or RTL, upload it for a complete review, resolve bare subject columns, and atomically create or update valid assessment records without guessing identity.

## Notes

- Local planning effort: keep the map and tickets under `.scratch/wayfinder/assessment-workbook-round-trip/`; do not create GitHub issues or implement the feature while charting or resolving planning tickets.
- Skills to use while resolving tickets:
  - `/grilling` and `/domain-modeling` for product or vocabulary decisions
  - `/prototype` for download-builder and import-review interaction decisions
  - spreadsheet inspection/rendering for workbook contract and compatibility decisions
- Canonical terminology is recorded in `CONTEXT.md`: Assessment Workbook, Assessment Column, and Bare Subject Column.
- Confirmed product boundaries:
  - One workbook represents exactly one classroom and one selected term.
  - Users may select one or many classroom subjects and configure assessment columns independently for each subject.
  - A selected subject may intentionally export as one Bare Subject Column with no assessment binding.
  - Generated workbooks contain boys' and girls' roster sections only; missing student gender blocks download and must be corrected first.
  - Imports accept only School Clerk-generated workbooks, never legacy or custom spreadsheets.
  - Matching uses hidden signed metadata and stable tenant, term, classroom, student, subject, and assessment identifiers; visible names and labels are not identity.
  - A workbook always imports into its original bound term, even if the dashboard's current term later changes.
  - Existing scores are included at download; blank uploaded cells are accepted and leave current records unchanged.
  - Only literal numeric score values are accepted. Western, Arabic-Indic, and Eastern Arabic-Indic digits plus `.` and `٫` decimal separators normalize to standard numeric values.
  - Formulas, percentages, words, macros, invalid nonblank scores, and unresolved assessment columns are rejected.
  - Standalone assessments and scoreable sub-assessment children are selectable; grouped parent totals are not directly scoreable or selectable.
  - Import-time creation from a Bare Subject Column creates only a standalone assessment and requires title, maximum obtainable score, and result/print weight defaulting to `0%`.
  - Every upload requires review before writes. Review shows identity, new/changed/unchanged/blank counts, missing assessment resolutions, conflicts, stale rows, invalid values, and the exact write count.
  - A changed workbook score updates automatically only when the current database value still matches the download snapshot. Concurrent changes require explicit review.
  - Newly enrolled students do not invalidate an older workbook. Transferred/deleted students with blank cells are ignored; populated or changed stale rows block import.
  - Admins use all tenant classrooms/subjects; teachers remain restricted to their term assignments. Upload and import-time assessment creation revalidate current permissions.
  - The feature reuses the tenant-scoped Academic Data Direction (`AUTO | LTR | RTL`) and supports a per-download workbook direction override.
- Reference workbook observations from `/Users/M1PRO/Downloads/Untitled spreadsheet.xlsx`:
  - One Arabic-named worksheet and one classroom.
  - Separate boys' and girls' sections.
  - Two header rows: subjects on the first header row and multiple assessment subcolumns for one subject on the second.
  - Other subjects appear as Bare Subject Columns.
  - Arabic-Indic serial numbers and Arabic student/subject/assessment labels.
- Primary Brain context:
  - `.brain/features/assessment-results-and-sub-assessments.md`
  - `.brain/features/academic-data-direction.md`
  - `.brain/decisions/ADR-0009-scoped-academic-data-direction.md`
  - `.brain/api/contracts.md`
  - `.brain/api/endpoints.md`
  - `.brain/api/permissions.md`
  - `.brain/database/schema.md`
  - `.brain/database/relationships.md`
  - `.brain/engineering/ai-rules.md`
  - `.brain/engineering/coding-standards.md`
- Current implementation observations:
  - `apps/dashboard/src/components/classroom-result-table.tsx` currently exports a client-generated CSV and prints filled or blank browser tables.
  - `apps/dashboard/src/components/assessment-recording-results-table.tsx` is the agreed primary entry surface and already consumes `AcademicDataDirectionProvider`.
  - `apps/api/src/db/queries/report-sheet.ts` and `assessments.getClassroomReportSheet` provide the classroom roster, subjects, assessments, and score data.
  - `apps/api/src/db/queries/assessments.ts` owns assessment creation and score updates with teacher-access assertions.
  - `packages/assessment-results` owns browser-safe assessment schemas, scoreability rules, result-row construction, and parent-aware labels.
  - `packages/db/src/schema/assessment.prisma` enforces one student/term-form/assessment record and models grouped assessment hierarchy.

## Decisions so far

- [Package boundary](tickets/define-assessment-workbook-package-boundary.md): a focused browser-safe/server-split workbook package now owns contracts, planning, signing, and XLSX processing.
- [Download contract](tickets/define-download-builder-contract.md): the Assessment Recording toolbar opens a configurable one-classroom builder with per-subject columns and direction override.
- [Security model](tickets/define-authorization-and-workbook-security-model.md): persisted exports, HMAC metadata, strict hostile-file preflight, tenant binding, and current teacher/admin checks protect every phase.
- [Workbook contract](tickets/specify-signed-workbook-contract.md): version 1 uses one protected visible sheet plus one very-hidden signed metadata sheet with stable coordinates and original scores.
- [Score contract](tickets/define-score-normalization-and-validation-contract.md): deterministic Western/Arabic digit normalization, blank no-ops, and strict literal-number validation are implemented and tested.
- [Conflict plan](tickets/design-import-verification-and-conflict-algorithm.md): preview performs a read-only three-way comparison and blocks conflicts, invalid values, unresolved columns, and populated stale rows.
- [Bare-column transaction](tickets/define-bare-subject-resolution-and-assessment-creation-transaction.md): review links an existing scoreable assessment or creates a standalone assessment inside the final atomic transaction.
- [Execution model](tickets/choose-import-execution-audit-and-idempotency-model.md): bounded synchronous serializable apply, tenant idempotency, file digest, and durable summaries are implemented.
- [Workflow](tickets/design-assessment-workbooks-workflow-and-rtl-review-ui.md): a wide responsive Download/Upload dialog supports scoped RTL, resolution, counts, blockers, exact changes, and confirmation.
- [Verification](tickets/define-verification-and-rollout-matrix.md): package tests, application typechecks, database validation, security fixtures, and browser smoke are recorded in the implementation handoff.
- [Handoff](tickets/build-assessment-workbooks-implementation-handoff.md): implementation lives in the linked package, API, dashboard, database, Brain, and ADR files.

## Tickets

- [Define Assessment Workbook Package Boundary](tickets/define-assessment-workbook-package-boundary.md)
- [Define Download Builder Contract](tickets/define-download-builder-contract.md)
- [Define Authorization And Workbook Security Model](tickets/define-authorization-and-workbook-security-model.md)
- [Specify Signed Workbook Contract](tickets/specify-signed-workbook-contract.md)
- [Define Score Normalization And Validation Contract](tickets/define-score-normalization-and-validation-contract.md)
- [Design Import Verification And Conflict Algorithm](tickets/design-import-verification-and-conflict-algorithm.md)
- [Define Bare Subject Resolution And Assessment Creation Transaction](tickets/define-bare-subject-resolution-and-assessment-creation-transaction.md)
- [Choose Import Execution Audit And Idempotency Model](tickets/choose-import-execution-audit-and-idempotency-model.md)
- [Design Assessment Workbooks Workflow And RTL Review UI](tickets/design-assessment-workbooks-workflow-and-rtl-review-ui.md)
- [Define Verification And Rollout Matrix](tickets/define-verification-and-rollout-matrix.md)
- [Build Assessment Workbooks Implementation Handoff](tickets/build-assessment-workbooks-implementation-handoff.md)

## Deferred after first release

- Operator history UI, rollback, downloadable post-import result files, background execution, and progress/cancellation remain future enhancements.
- Additional spreadsheet-application compatibility certification and operational alert thresholds remain rollout follow-up.

## Out of scope

- AI-assisted parsing, matching, or formatting.
- Importing legacy, arbitrary, manually created, CSV, Google Sheets, or non-School Clerk workbooks.
- A workbook containing multiple classrooms or terms.
- An unspecified-gender roster section or silently omitting students whose gender is missing.
- Creating grouped assessments or sub-assessment hierarchies during import.
- Direct score writes to grouped parent assessments.
- Formula-driven scores, percentages, words, macros, or executable workbook content.
- Global dashboard localization or application-wide RTL; this feature uses the existing scoped academic direction.
- Implementing the feature during this Wayfinder map.
