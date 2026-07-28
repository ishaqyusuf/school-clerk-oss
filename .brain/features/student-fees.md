# Student Fees System

## Overview
Student fees are the school-side charges billed to individual students. They are separate from `Billable`/`BillableHistory` (which are for staff payroll and service expenses).

## Admission Audience And Required Status

- Standardized `FinanceItem` rows have a `studentAudience` of all students, new
  admissions only, or returning students only.
- Audience is independent of `collectable`: required matching items auto-charge;
  optional matching items appear as quick fee choices during student creation.
- Applicability combines session, term, classroom, and the selected
  `StudentTermForm.admissionType`.
- Creating a current-term item immediately reconciles matching term forms.
  Classification changes create newly required charges and cancel only unpaid
  no-longer-applicable item-backed charges. Paid and partially paid rows remain.
- New fee creation never reuses an existing item by name. Reusing a title
  creates a separate structure for the selected period; only the edit flow
  updates an existing item.
- Current-term reconciliation runs in bounded batches, retries each failed
  batch once, and reports a partial result without rolling back the already
  saved fee or successful batches.

## Data Model Lifecycle

```
Fees (base definition, per school)
  └── FeeHistory (per-term version, with wallet + classroom targeting)
        ├── wallet: Wallet? (accounting stream — auto-created if not assigned)
        └── classroomDepartments: ClassRoomDepartment[] (M:N — empty = all classes)

FeeHistory → StudentFee (created when student pays or fee is applied)
  └── StudentFee.feeHistoryId: links back to which FeeHistory spawned it
      └── StudentPayment (each payment receipt)
            └── WalletTransactions (ledger entry in the linked Wallet)
```

## Key Models

### `Fees`
- Base fee definition, scoped to `SchoolProfile`
- Fields: `title`, `description`, `amount` (base, overridden per-term in history)

### `FeeHistory`
- Per-term fee record. Created when a fee is defined for a term or imported from a previous term.
- Key fields: `amount`, `termId`, `schoolSessionId`, `current`, `walletId`, `classroomDepartments[]`
- **Classroom targeting**: if `classroomDepartments` is empty, the fee applies to ALL classes. Otherwise only to students in the listed departments.
- **Wallet**: the `Wallet` record receives the payment transaction when a student pays this fee.

### `StudentFee`
- Per-student fee record. Created on first payment or manual application.
- Fields: `billAmount`, `pendingAmount`, `feeTitle`, `feeHistoryId`, `billablePriceId` (legacy, for billable-based fees)
- `pendingAmount` decrements with each payment.

### `StudentPayment`
- Individual payment receipt, linked to `StudentFee` and `WalletTransactions`.

## tRPC Procedures

### `transactions.getSchoolFees`
- Lists `Fees` for the current school+term, including per-term `FeeHistory` with wallet + classrooms.

### `transactions.createSchoolFee`
- Creates (or updates) a `Fees` + `FeeHistory` record.
- Input: `title`, `amount`, `description?`, `streamId?`, `streamName?`, `classroomDepartmentIds[]`
- Wallet resolution: finds existing wallet by `streamId`, or find-or-creates by `streamName` (type="fee").
- `termId` falls back to `ctx.profile.termId`.
- When `feeId` targets an existing fee in the current term, the active `FeeHistory` row is updated in place (amount, stream, classrooms) instead of creating a duplicate current-term history.
- After a fee is created for the current term, the dashboard can immediately prompt staff to apply that fee to every matching `StudentTermForm` in the term.

### `transactions.getPreviousTermFees`
- Returns `FeeHistory` records (current=true) from past terms whose `feeId` does NOT yet have a `FeeHistory` in the current term.
- Used to populate the "Import" sheet on the fees management page.

### `transactions.importFees`
- Input: `feeHistoryIds[]`
- Copies selected `FeeHistory` records to the current term (copies amount, wallet, classrooms).
- Idempotent: skips if a `FeeHistory` for the same `feeId` + current term already exists.

### `transactions.deleteSchoolFeeCurrentTerm`
- Soft-deletes the current-term `FeeHistory` row for a fee.
- Removes the fee from the active term list without deleting the base `Fees` record or earlier term history.

### `transactions.getFeeApplyPreview`
- Returns a preview for a `FeeHistory` application run:
  - eligible students
  - already applied count
  - remaining students to apply
  - classroom scope

### `transactions.applyFeeToClass`
- Applies a current-term `FeeHistory` to all matching active `StudentTermForm` rows in the term.
- Idempotent: skips students who already have a non-cancelled `StudentFee` for that `feeHistoryId`.

### `finance.getReceivePaymentData`
- Returns `manualFeeHistories[]` alongside `manualBillables[]`.
- These are applicable `FeeHistory` records for the current term that haven't yet been applied to the student (no `StudentFee.feeHistoryId` match).
- Classroom filtering: only returns fee histories applicable to the student's current classroom department.
- Summary totals now include unapplied `manualFeeHistories` in `totalDue` and `totalPending`, so overview cards and the receive-payment sheet show the student's true current-term balance even before the fee is applied.
- Finance charge reconciliation is serialized per student term sheet before creating missing charge rows, so concurrent payment/payable queries cannot temporarily create duplicate all-classroom charges.
- When no explicit term is supplied, finance student queries default to the active dashboard term instead of the latest-created student term sheet, keeping payables aligned with the selected operational term.

### `finance.getReceivePaymentOptions`
- Returns the simplified receive-payment option read model for a selected student.
- Accepts `paidForStudentTermFormId?`, validates the selected form through the tenant-owned student, and defaults to the student's form in the active dashboard term (or the newest valid historical form when the student has no active-term form).
- Returns every valid student term form newest-first as a full `Session · Term` label, the selected paid-for term, and the active dashboard term/session that will own the cash entry.
- Payment types, descriptions, and outstanding totals are scoped to the selected form's session, classroom, and configured fees. Presentation metadata carries the full term label without changing stored stream, item, or charge titles.
- Configured options are limited to active, collectable, tenant-owned finance items that are global/selected-term, session-compatible, and applicable to the selected historical classroom.
- Existing selected-term charges take precedence over their configured item so a fee is not listed twice. Outstanding historical charges remain available even when their finance item is inactive.
- Permission flags distinguish receiving payment from creating reusable simple collections, school fees, reusable descriptions/items, and one-off manual charge rows.

### `finance.receiveStudentPaymentSimple`
- Provides the simplified cashier submit path for the new receive-payment flow.
- Accepts either an existing outstanding `chargeId`, a configured collectable `itemId`, or a quick-created stream/title pair for one-off/simple collection payments.
- Configured item payments create the applicable finance charge against the selected paid-for `StudentTermForm` before recording the payment; quick-created payments create a one-off charge under the selected or newly named finance stream and selected student term.
- Validates positive payment amounts, blocks overpayment against known due/outstanding amounts, and returns `paymentIds[]` for receipt printing.
- Persists collected-in term/session on `FinancePayment` and `FinanceLedgerEntry` separately from the paid-for term on `FinanceCharge`, so late payments for previous terms affect the current term account while reducing the old obligation.
- Existing historical charges can be settled after the old ledger closes: the existing charge balance/status is updated while the payment and ledger entry post in the current term. Creating a missing historical charge keeps the existing closed-ledger guard and requires the old term to be reopened.

### `finance.receiveStudentPayment`
- Handles allocation source `"feeHistory"`:
  - Finds the `FeeHistory` record.
  - Find-or-creates a `StudentFee` linked by `feeHistoryId`.
  - Resolves wallet from `FeeHistory.walletId` or creates one by fee title.
  - Records `WalletTransactions` + `StudentPayment`.
  - Rejects payment attempts for fee histories that do not apply to the student's current classroom.
- Runs inside an extended interactive transaction timeout because payment flows can create wallets, charges, ledger entries, and receipts in one request.
- Returns the created `paymentIds[]` so the dashboard can open a printable/downloadable receipt immediately after a payment is recorded.
- Also dispatches typed finance notifications for successful payment receipt, with both in-app rows and registered email templates.
- Also creates a tenant activity log entry for payment receipt.

### `finance.reverseStudentPayment`
- Cancels an existing successful student payment by marking both the wallet transaction and the `StudentPayment` row as `cancelled`.
- Restores the linked `StudentFee.pendingAmount` so the student balance reopens correctly.
- Dispatches typed finance notifications for payment cancellation, including an email template registration for the event.
- Also creates a tenant activity log entry for payment cancellation.

## UI

### Fees Management Page (`/finance/fees-management`)
- **Create Fee** button → opens sheet with:
  - Title, Description, Amount
  - Incoming Stream (combobox — select existing or create new)
  - Applicable Classrooms (multi-select — empty = all classes)
- **Row actions**:
  - Edit current-term fee configuration in place
  - Remove fee from the current term with soft-delete semantics
  - Apply the fee to eligible students with preview counts
- **Import** button → opens `ImportFeesSheet`:
  - Lists all fees from previous terms not yet in current term
  - Single-click import per row OR checkbox batch import
  - Copies stream and classroom assignments

### Columns
- Fee name + description
- Amount (current term price)
- Stream (wallet name)
- Classrooms (department names or "All classes")

### Receive Payment Sheet (`/finance` → "Receive Payment")
- The default sheet is a guided cashier workflow: select/confirm student, choose **Paying for**, choose payment type, choose description/item, confirm price and amount paid, then enter method/date/reference/note.
- The student picker is sourced from canonical student records, de-duplicated by student ID, and defaults to students registered in the active dashboard session and term. Its classroom and term subtitle is taken from that same active registration.
- **Paying for** defaults to the student's active-term form and lists valid historical forms newest-first using full `Session · Term` labels.
- Changing **Paying for** reloads term-scoped options and clears stale payment type, description, amount, note, and receipt state.
- Payment type and description options come from `finance.getReceivePaymentOptions`, show their full paid-for term, prioritize outstanding items, and load configured default amounts.
- The confirmation area shows `Paid for` and `Collected in` separately for historical payments. The active dashboard term remains the collected-in accounting period.
- Operators can type a new payment type or description for one-off/simple collections; submission maps that intent through `finance.receiveStudentPaymentSimple`.
- When the options read model grants reusable simple-collection creation, a typed new payment type/description is first saved as an active collectable `FinanceItem`, then the payment is submitted against that item so the option appears for future student payments.
- Operators without reusable-creation permission can still record the payment as a one-off charge, with the sheet indicating that the new option is only for the current payment.
- Admin users who type a missing payment type can route it into the existing Add Fee sheet through **Create as school fee**. The handoff carries the typed title, selected student, selected paid-for term sheet, and classroom department. The Add Fee sheet can then default to a selected-student scope that creates direct `FinanceCharge` rows for that student, or switch to the normal class/global school-fee configuration when the fee should apply beyond the selected student.
- Payment method defaults to Bank Transfer, payment date defaults to today, and reference/note remain optional.
- Successful submissions show immediate **Print Receipt** and **Download PDF** actions backed by the payment IDs returned from the API.
- The previous allocation-heavy flow is retained unchanged as `LegacyReceivePaymentSheet` and is reachable from the default sheet through an Advanced switch, with a Simple mode action to return to the compact cashier flow.

### Dashboard Quick Link
- "Receive Fee" button on the main dashboard page opens the receive-payment sheet directly.

### Student Payment History
- Each successful payment row now exposes receipt actions so staff can print or download a receipt later from the student overview.
- The cancellation action is now labeled `Cancel` instead of `Reverse`, matching the new cancellation wording used across finance and notifications.
- The student overview payment history renders as stacked, labeled payment cards on mobile while preserving the dense table layout on desktop.

### Student Billing Form
- Creating a student fee from the student finance tab now opens the same "apply fee to students" confirmation modal used on fees management when the fee is backed by a `FeeHistory`.
- This lets staff decide whether a fee created for one student should also be propagated to all matching students in the same term/class scope.

### Enrollment and Promotion
- When a student is enrolled into a term or promoted into a new term, all matching current-term `FeeHistory` records are automatically applied to the new `StudentTermForm`.
- Matching follows classroom targeting rules:
  - empty classroom list means all classes
  - targeted classroom fees only apply when the student's `classroomDepartmentId` matches

### Receive Payment Sheet
- The selected student summary now includes an **Open student overview** CTA that closes the payment sheet and opens the student's overview on the finance tab for the active term.

## Billables vs Fees (Clarification)

| Concept | Model | Who pays | Use case |
|---------|-------|----------|----------|
| **Student Fee** | `Fees` + `FeeHistory` | Students | Tuition, levies, exam fees, uniforms |
| **Billable** | `Billable` + `BillableHistory` | School (expense) | Staff salary, service contracts, misc bills |

Billables drive `Bills` records and connect to `StaffTermProfile`. Do NOT use `BillableHistory` for student charges.
- The finance navigation and billables workspace are now labeled **Service Billables** to reinforce this distinction.
