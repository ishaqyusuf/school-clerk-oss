# Student And Staff Payment Import

## Overview

SchoolClerk supports reviewed, durable CSV imports for historical student
collections and staff wage payments. The workflow follows the existing student
import shape: setup, server verification, row review, background execution, and
persisted progress.

## Entry Points

- `/finance/students`: import student payments.
- `/finance/payables/payroll`: import staff wage payments.
- Both entry points open the shared `PaymentImportModal` with the appropriate
  import mode.

## CSV Contracts

Student payment CSV:

```csv
date,student_name,payment_type,amount,source_note
```

Staff payment CSV:

```csv
date,staff_name,payment_type,amount,source_note
```

- `source_note` is optional.
- `date` may be blank during parsing but must be resolved before execution.
- `amount` must be positive.
- Student payment types are `SCHOOL_FEE`, `ENTRANCE_FORM`, `BOOK`, and
  `UNIFORM`.
- Staff imports support `WAGE`.
- Friendly aliases such as `school fee`, `tuition`, `form`, `books`, `salary`,
  and `wages` are normalized by the dashboard parser.
- Session and term are not CSV columns. The operator selects the term once for
  the entire import batch.

## Verification

- Requires Admin or Accountant finance-write access.
- Resolves the selected term inside the active tenant.
- Matches student/staff names using normalized Arabic and Latin text while
  preserving the original display name.
- Student rows require an existing term sheet in the selected term.
- Student collections require a CREDIT finance stream; staff wages require a
  DEBIT finance stream.
- The response includes the complete tenant-scoped student/staff choice list
  so low-confidence names can still be resolved explicitly.
- Optional finance items are limited to the selected tenant/session/term and
  account. Student items must also be collectable and applicable to the
  student's selected-term classroom, admission type, and canonical gender.
- Missing dates, unresolved people, missing streams, wrong stream direction,
  and missing student term sheets block execution.
- Semantic fingerprints use mode, selected term, date, normalized name,
  payment type, amount, and note. Identical rows in the same file or a prior
  completed import require an explicit per-row `Import duplicate anyway`
  decision. This decision is internal and does not add a CSV column.
- Review rows are grouped as `Needs attention`, `Ready`, and `Skipped`.
  Skipping a row is an internal review decision and does not add a CSV column.
- Execution requires explicit acknowledgement that the globally selected
  session/term applies to every included row.

## Durable Execution

- `FinancePaymentImportJob` captures tenant, session, term, mode, method,
  source filename, progress, totals, creator, and Trigger.dev run id.
- `FinancePaymentImportJobRow` captures the normalized row payload, fingerprint,
  match/mapping decisions, progress, result ids, and failure reason.
- `process-finance-payment-import-job` processes each row in its own database
  transaction.
- Each successful row creates a canonical `FinancePayment`,
  `FinancePaymentAllocation`, and `FinanceLedgerEntry`. It creates or updates
  the associated `FinanceCharge`.
- Configured student items first use an existing selected-term outstanding
  charge. Otherwise the worker creates the configured obligation. Separate
  partial rows remain separate payments while settling the same charge.
- Execution revalidates classroom, admission, and gender eligibility rather
  than trusting the preview, preventing a stale or edited import row from
  posting an ineligible configured fee.
- Student rows are attributed to the selected student and term sheet. Staff
  rows are attributed to the selected staff profile.
- The deterministic payment reference `payment-import:<job-row-id>` makes row
  replay idempotent. A database row lock serializes duplicate worker attempts
  before that reference is checked.
- Completed job replay returns the persisted result without another completion
  activity.
- Failed/partially failed jobs can retry only non-imported rows. The dashboard
  can resume the latest active job after refresh.
- Completed jobs can export a result CSV containing source fields, decisions,
  matched ids, created finance ids, and row errors.
- Imports into closed term ledgers are rejected.
- Imported historical rows do not emit parent or staff notifications.

## Extracted Daarul Hadith Sources

The conversation-derived source files are kept out of the product runtime under:

- `.scratch/payment-import/daarul-hadith/student-payments.csv`
- `.scratch/payment-import/daarul-hadith/student-payments-previous-term.csv`
- `.scratch/payment-import/daarul-hadith/staff-payments.csv`

The files preserve uncertain dates and provenance in `source_note`; they must be
reviewed against the intended tenant and selected term before execution.

## Validation

- CSV parser tests cover Arabic text, quoted values, optional notes, blank
  dates, wrong modes, and required mode-specific headers.
- API tests cover Arabic matching, student term-sheet blocking, duplicate
  decisions, tenant- and audience-scoped item validation, global-term
  persistence, canonical finance writes, separate partial-payment allocation,
  and failed-row retry.
- API and dashboard typechecks pass.
- Prisma schema was pushed to local and production databases on 2026-07-23.
