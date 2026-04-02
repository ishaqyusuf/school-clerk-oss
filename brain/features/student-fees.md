# Student Fees System

## Overview
Student fees are the school-side charges billed to individual students. They are separate from `Billable`/`BillableHistory` (which are for staff payroll and service expenses).

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

### `finance.getReceivePaymentData`
- Returns `manualFeeHistories[]` alongside `manualBillables[]`.
- These are applicable `FeeHistory` records for the current term that haven't yet been applied to the student (no `StudentFee.feeHistoryId` match).
- Classroom filtering: only returns fee histories applicable to the student's current classroom department.
- Summary totals now include unapplied `manualFeeHistories` in `totalDue` and `totalPending`, so overview cards and the receive-payment sheet show the student's true current-term balance even before the fee is applied.

### `finance.receiveStudentPayment`
- Handles allocation source `"feeHistory"`:
  - Finds the `FeeHistory` record.
  - Find-or-creates a `StudentFee` linked by `feeHistoryId`.
  - Resolves wallet from `FeeHistory.walletId` or creates one by fee title.
  - Records `WalletTransactions` + `StudentPayment`.
  - Rejects payment attempts for fee histories that do not apply to the student's current classroom.
- Returns the created `paymentIds[]` so the dashboard can open a printable/downloadable receipt immediately after a payment is recorded.

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
- **Add school fee** card: combobox listing unapplied `FeeHistory` items for the selected student's classroom
- Adding a fee creates a `"feeHistory"`-source allocation row in the payment table
- Alert shown when there are unapplied fees (combined with unapplied billables count)
- Outstanding summary includes unapplied school fees, so collectors see the full amount due before choosing which items to allocate
- Successful submissions show immediate **Print Receipt** and **Download PDF** actions backed by the payment IDs returned from the API

### Dashboard Quick Link
- "Receive Fee" button on the main dashboard page opens the receive-payment sheet directly.

### Student Payment History
- Each successful payment row now exposes receipt actions so staff can print or download a receipt later from the student overview.

## Billables vs Fees (Clarification)

| Concept | Model | Who pays | Use case |
|---------|-------|----------|----------|
| **Student Fee** | `Fees` + `FeeHistory` | Students | Tuition, levies, exam fees, uniforms |
| **Billable** | `Billable` + `BillableHistory` | School (expense) | Staff salary, service contracts, misc bills |

Billables drive `Bills` records and connect to `StaffTermProfile`. Do NOT use `BillableHistory` for student charges.
- The finance navigation and billables workspace are now labeled **Service Billables** to reinforce this distinction.
