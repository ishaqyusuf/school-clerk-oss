# Finance Operations and Reconciliation

## Overview
Finance now includes an operator-facing reconciliation and reporting workflow in addition to transactional pages.

This layer covers:

- finance integrity checks
- canonical reporting snapshots
- CSV exports for major finance surfaces
- service billable to payable generation
- settlement backfill for legacy payable rows
- audit-style finance activity records
- admin approval thresholds for large discretionary finance actions

## Reconciliation Workspace

### Route
- `/finance/reconciliation`

### Purpose
- Surface finance mismatches before they become reporting problems.
- Give finance admins one place to export trusted operational reports.
- Provide maintenance actions for settlement backfill and billable generation.

### Current Integrity Checks
- ledger entries missing collected-in and paid-for term attribution
- negative accounts that need funding before close
- pending staff/school payables
- unresolved transfers
- cancelled or refunded records that still have active ledger effects
- carry-forward rows not linked to opening ledger entries

### Current Report Exports
- term ledgers and accounts
- payroll and staff payables
- purchases, services, labor, reimbursements, and direct expenses
- student collections and arrears
- product/project account summaries
- reconciliation records and audit-trail projections
- payables/owing ledger

## Term Ledger Foundation

### `finance.getTermLedger`
- Provides the first operator-facing **Term Ledger** read model for the active or selected term.
- The current implementation is derived from `SessionTerm`, finance streams, and finance ledger entries rather than a persisted close/snapshot table.
- Response includes term/session identity, status label, account summaries, money in/out, available balance, deficit account count/amount, outstanding payables, needs-funding account count, lifecycle metadata, and Admin-only close/reopen capability flags.
- Account rows expose `outstandingPayables`, `outstandingPayablesCount`, `needsFunding`, and `statusLabel` so salary/service/expense obligations can be shown with operator-facing labels.
- Term close snapshots, carry-forward entries, and historical lock/reopen persistence remain planned follow-up work.

### `finance.getTermAccountStatement`
- Opens one term account/stream into an operator-facing statement.
- Response uses simple finance labels (`Money In`, `Money Out`, `Available Balance`, `Deficit`, `Needs Funding`) and maps ledger entry direction to `money-in` / `money-out`.
- Includes charge, payment, transfer, and payer context so bursary users can explain how an account balance changed within the selected term.
- Entries are scoped by collected-in term/session when present, with a charge-term fallback for older rows. Statement entries also expose paid-for term ids from the linked charge so late payments can be explained without moving cash into a closed/older term.

### `finance.transferFunds`
- Moves money between finance streams/accounts with a required note/reason.
- Writes two ledger entries for each transfer: Money Out from the source account and Money In to the destination account.
- Requires Admin/Accountant finance-write access; transfers above `NGN 250,000` and insufficient-balance overrides require Admin role.
- Transfers in a closed current term are blocked until an Admin reopens the ledger.

### `finance.previewTermClose` / `finance.closeTermLedger` / `finance.reopenTermLedger`
- Preview returns the selected term ledger, warnings, blockers, next-term target, and per-account carry-forward rows.
- Preview warnings cover negative accounts, pending staff/school payables, ledger entries missing term attribution, unresolved transfers, cancelled or refunded records that still have active ledger effects, carry-forward rows not linked to opening ledger entries, and missing next-term targets.
- Close is Admin-only and creates a durable `FinanceTermLedgerClose` row plus one `FinanceTermCarryForward` row per non-zero account balance.
- When a next term exists, close creates opening balance `FinanceLedgerEntry` adjustment rows scoped to that next term. Automatic next-term selection only chooses a future term in the same session, using the current term's start date when available.
- Closed ledgers block normal payment, charge, and transfer writes until an Admin reopens the ledger.
- Reopen marks the close row as `REOPENED` and preserves close/carry-forward history for audit.

## Payroll, Wages, Purchases, And Payees

### `finance.upsertPayrollStructure`
- Stores reusable staff salary/wage structures with cadence, base amount, allowances, bonuses, deductions, advances, and computed net amount.
- Teaching and non-teaching staff share the same model; role labels and staff profile metadata provide filtering context.
- Structures link to the Salary/Wages account stream and can generate canonical salary/wage `FinanceCharge` obligations.

### `finance.recordPurchase`
- Records purchases, services, vendor bills, direct expenses, reimbursements, and casual labor.
- Creates or reuses a `FinancePayee`, creates a payable `FinanceCharge`, and optionally records immediate payment through the standard `FinancePayment` + `FinanceLedgerEntry` path.
- The service expense form now uses this route so operators can select or quick-create vendors/payees and optionally mark the expense paid immediately.
- `finance.cancelPurchase` preserves purchase history, cancels the linked charge, and reverses any linked payment through the standard reversal path so refunds/cancellations do not delete ledger history.

### Staff And Payee History
- `finance.getStaffFinanceHistory` powers the staff profile Finance tab with salary structures, wage/salary obligations, payment receipts, paid totals, and outstanding balances.
- `finance.getPayeeHistory` exposes reusable vendor/payee purchase and payment history with canonical finance links.
- The main ledger remains the accounting source of truth; payroll/purchase/payee records provide operator context.

## Product/Project Accounts

### `finance.getProjectAccountSummary`
- Opens a stream/account as a product or project account, such as Uniforms or Books.
- Shows funding transfers, student sales income, purchase costs, labor/service/reimbursement costs, available balance, and profit/loss.
- Does not require full inventory warehouse behavior in v1; inventory can remain an optional adjacent workflow.

## Billable To Payable Automation

### `finance.generateBillsFromBillables`
- Creates payable `Bills` rows from current-term `BillableHistory` rows.
- Prevents duplicate generation when an active payable already exists for the same billable history.
- Resolves or creates the correct outgoing bill stream.

## Legacy Settlement Backfill

### `finance.backfillBillSettlements`
- Hydrates legacy invoice-backed payables into the new settlement model.
- Keeps the system compatible while older rows are moved onto `BillSettlement`.

## Finance Governance

### Audit-style activity logging
The finance module now records tenant activity entries for key actions such as:

- stream funding and withdrawals
- internal transfers
- payroll/service payable creation and payment
- owing repayment
- billable creation/deletion
- billable generation into payables
- fee waivers and discounts
- student payment receipt and cancellation

### Large-action approval thresholds
Large discretionary actions now require `Admin` role once they exceed the configured in-code threshold:

- stream withdrawals
- internal transfers
- fee waivers
- fee discounts

Current threshold:
- `NGN 250,000`

## Notes
- This is an operational trust layer on top of the existing finance transaction system.
- The next hardening step should be true automated regression coverage and deeper reconciliation assertions across reports and exports.
