# Objective

Build a durable payment import workflow, modeled on the existing student
import experience, that imports historical student collections and confirmed
staff wage payments through SchoolClerk's finance ledger. Keep the source CSV
small, select the applicable session and term once per import, and preserve
permissions, audit history, and idempotency.

# Assumptions

- The first release supports two import modes: student payments and staff
  payments.
- Student CSV columns are exactly:
  `date,student_name,payment_type,amount,source_note`.
- Staff CSV columns are exactly:
  `date,staff_name,payment_type,amount,source_note`.
- `source_note` is optional. The other four columns are required, although a
  blank historical date may be resolved during review.
- Session and term are selected globally during import setup. Every row in one
  import job uses that selection.
- Payments belonging to different terms must be uploaded as separate import
  batches. The extracted previous-term student payments therefore have their
  own CSV.
- Student collections use `FinancePayment` plus allocations to a
  `FinanceCharge`; staff wages use the existing payroll/payee charge and
  payment model.
- The import excludes unpaid payables, bank transfers, general expenses, and
  unrelated bank transactions.
- Admin and Accountant roles may run imports. Other roles have no write access.
- Historical imports do not emit parent or staff notifications by default,
  but they create activity and ledger audit records.

# Detailed Execution Plan

## 1. Lock the minimal CSV contracts

1. Define separate Zod schemas for student and staff source rows.
2. Student source row:
   `date`, `student_name`, `payment_type`, `amount`, `source_note`.
3. Staff source row:
   `date`, `staff_name`, `payment_type`, `amount`, `source_note`.
4. Keep operational metadata out of the CSV. Generate `rowId`, `rowNumber`,
   normalized names, match IDs, stream/item IDs, decisions, fingerprints, and
   execution results internally.
5. Normalize payment types to canonical values:
   `SCHOOL_FEE`, `ENTRANCE_FORM`, `BOOK`, `UNIFORM`, and `WAGE`.
6. Require a positive amount, supported payment type, non-empty name, resolved
   counterparty, resolved finance mapping, and exact payment date before
   execution.

Dependency: confirm the tenant session and term represented by the current-term
CSV and the separate previous-term CSV.

Validation: reject unknown headers, extra required data, malformed amounts,
unsupported types, missing names, and invalid dates; accept an omitted or blank
`source_note`.

## 2. Parse and normalize source files

1. Support UTF-8 CSV upload and pasted CSV using a proper parser with quoted
   fields and BOM handling.
2. Accept friendly aliases such as `school fee`, `tuition`, `form`, `entrance
   form`, `book`, `uniform`, `wage`, and `salary`.
3. Preserve Arabic display text exactly. Normalize whitespace, punctuation,
   and common Arabic alef/hamza variants only in a separate matching value.
4. Parse ISO dates when present. Mark blank dates as `needs_date`; never
   silently substitute the upload date.
5. Generate a stable normalized fingerprint for duplicate warnings from import
   mode, selected term, date, normalized name, payment type, amount, and note.
6. Treat same-day identical-looking rows as warnings rather than automatic
   deletions because legitimate repeated payments are possible.

Dependency: reuse domain-neutral name normalization and CSV parsing helpers from
the existing student import where suitable.

Validation: fixtures cover Arabic names, quoted notes, blank dates, partial
payments, duplicate warnings, BOM input, and all three extracted CSVs.

## 3. Add global import setup

1. Add separate `Import student payments` and `Import staff payments` entry
   points in the finance workspace for Admin and Accountant users.
2. Reuse the existing student-import flow: setup, review, and durable
   execution.
3. Setup captures:
   - CSV file or pasted CSV
   - session
   - term
   - default payment method
   - optional default date for rows with missing dates
   - optional default finance stream/item
4. Display a persistent batch banner showing the selected school, session,
   term, import mode, row count, and amount.
5. Do not expose per-row term editing. To change term, the operator starts a
   separate batch or returns to setup before execution.
6. Lock the selected session and term after execution starts.

Validation: changing the global term reruns verification for every row; the
confirmation screen requires explicit acknowledgement of the selected term.

## 4. Build server-side matching and verification

1. Add tenant-scoped verification procedures for student and staff rows.
2. Student matching:
   - search all tenant students
   - prefer exact normalized-name matches
   - show student ID, classroom, and selected-term enrollment context
   - resolve the appropriate selected-term charge without writing during
     verification
3. Staff matching:
   - match `StaffProfile` first
   - allow a reviewed `FinancePayee` fallback only for non-staff workers
   - resolve an existing payroll/wages structure where possible
4. Resolve payment types against existing `FinanceStream` and `FinanceItem`
   records. Quick-create requires finance setup permission.
5. Return row statuses:
   `ready`, `possible_match`, `needs_counterparty`, `needs_date`,
   `needs_stream`, `duplicate`, `invalid`, and `skipped`.

Dependency: use the existing finance receive-payment options service so manual
and imported payments share the same stream/item rules.

Validation: tenant isolation, exact and ambiguous matching, missing dates,
partial payments, global-term changes, and duplicate warnings.

## 5. Create the review experience

1. Present flat rows grouped into `Needs attention`, `Ready`, and `Skipped`.
2. Student rows show date, student name, payment type, amount, optional source
   note, matched student, and finance mapping.
3. Staff rows show the equivalent fields with matched staff/payee.
4. Permit row-level corrections only for source data and matching decisions:
   date, name match, payment type, amount, note, stream/item, and import/skip.
5. Keep session and term visible but global.
6. Show reconciliation totals for uploaded, ready, unresolved, skipped,
   duplicate-warning, and executable rows.
7. Block execution while selected rows have unresolved dates, counterparties,
   finance mappings, or duplicate decisions.

Dependency: reuse student-import review state, draft recovery, error
presentation, and responsive dialog patterns.

Validation: keyboard navigation, Arabic/RTL content, mobile layout, refresh
recovery, bulk corrections, and large-file interaction.

## 6. Add durable import jobs

1. Add `FinancePaymentImportJob` and `FinancePaymentImportJobRow` models rather
   than overloading `StudentImportJob`.
2. Store the global school, session, term, import mode, payment method, creator,
   original file metadata, totals, and job status.
3. Store each parsed source row, generated row ID/number, normalized values,
   match decisions, fingerprint, result IDs, status, and error details.
4. Add start/status procedures and a Trigger.dev task following
   `process-student-import-job`.
5. Process each row in its own transaction and update aggregate progress after
   every terminal row.
6. Use `jobId + persistedJobRowId` as the execution idempotency key. Use the
   semantic fingerprint only for cross-job duplicate warnings.
7. Retrying a completed row returns its existing payment, charge, allocation,
   and ledger IDs.

Dependency: Prisma schema update and Trigger worker deployment.

Validation: retry, worker crash, refresh, partial failure, duplicate trigger,
cross-job duplicate warning, foreign-tenant access, and completed-job replay.

## 7. Execute student payment rows

1. Resolve or create the selected-term student charge through the existing
   finance service path.
2. Record `FinancePayment`, `FinancePaymentAllocation`, charge status updates,
   and `FinanceLedgerEntry` atomically.
3. Apply the globally selected session and term to every row.
4. Preserve partial payments as separate records; do not collapse
   `عبد الملك عبد الكبير`'s NGN 2,000 and NGN 1,000 rows.
5. Store the import job/row link and `source_note` for traceability.
6. Suppress notifications by default for historical imports.

Validation:

- Current-term CSV: 89 rows totaling NGN 242,200.
- Current-term breakdown: NGN 201,000 school fees, NGN 14,000 entrance forms,
  NGN 25,500 uniforms, and NGN 1,700 books.
- Previous-term CSV: 2 rows totaling NGN 6,000 in school fees.
- Combined source total: 91 rows totaling NGN 248,200.

## 8. Execute staff wage rows

1. Resolve the matched staff profile and wages stream/item.
2. Create a payroll obligation for each historical wage row, then record its
   payment so charge, payment, allocation, and ledger history stay coherent.
3. Require explicit review of the medium-confidence 17 Apr group allocations.
4. Require exact dates or a reviewed batch/row date override for the four
   unknown-date May payments.
5. Import only confirmed paid rows; do not recreate historical payables.
6. Store the import job/row link and `source_note`.

Validation: 31 imported rows totaling NGN 280,500, with per-staff totals of
NGN 70,000, NGN 93,000, NGN 42,500, and NGN 75,000.

## 9. Add audit, permissions, and reconciliation

1. Enforce the existing finance write guard and setup permissions.
2. Add activity entries for job creation, row decisions, execution, failure,
   retry, and completion.
3. Record who resolved ambiguous matches, duplicate warnings, and missing-date
   overrides.
4. Prevent imports into closed term ledgers unless an Admin uses the existing
   reopen workflow.
5. Show pre-execution totals by payment type and post-execution imported,
   skipped, failed, and duplicate totals.
6. Export a result CSV with source row number, source fields, decision, matched
   record, created IDs, and error message.
7. Run finance integrity checks across payments, allocations, charges, and
   ledger entries after completion.

Validation: reviewed executable totals equal imported totals and finance
reconciliation reports no integrity errors.

## 10. Roll out safely

1. Put the feature behind a tenant-scoped flag.
2. Verify the current-term student, previous-term student, and staff CSVs
   locally using the correct global term for each batch.
3. Dry-run matching and export the review results for approval.
4. Execute a small exact-match batch, reconcile it, then complete the remaining
   rows.
5. Deploy the Trigger worker before enabling production execution.
6. Update Brain documentation for finance operations, student fees, API
   contracts, permissions, database schema, jobs architecture, and the
   operational runbook when implementation begins.

Validation: targeted unit/integration tests, dashboard/API typechecks, worker
deployment check, and a production-like retry/recovery exercise.

# Skills List Used

- `plan`: structured the work into executable phases with dependencies and
  validation gates.
- `Project Brain integration`: aligned the plan with SchoolClerk's finance
  ledger, student import, permissions, term lifecycle, and Trigger.dev
  architecture.

# Risks and Mitigations

- Wrong global term: show it persistently, require confirmation, lock it after
  execution starts, and require separate files/jobs for different terms.
- Ambiguous names: require manual matching with classroom or staff context;
  never auto-import ambiguous rows.
- Missing historical dates: block execution until an exact row or batch date is
  explicitly chosen.
- Duplicate financial records: use persisted job-row idempotency and
  cross-job semantic warnings without automatically removing legitimate
  repeated payments.
- Ledger inconsistency: execute only through existing finance services and
  reconcile payment, allocation, charge, and ledger totals after import.
- Notification noise: suppress historical notifications by default while
  retaining audit activity.
- Closed historical terms: require the existing reopen workflow rather than
  bypassing term-ledger guards.
- Sensitive source data: keep extracted CSVs under `.scratch` and do not commit
  or publish them without explicit approval.
