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
- bills missing stream links
- legacy bill payments missing settlement rows
- cancelled payments that still show funded amounts
- streams whose projected balance is below zero
- overdue student fee rows

### Current Report Exports
- streams
- payroll
- service payments
- collections by classroom
- owing ledger

## Term Ledger Foundation

### `finance.getTermLedger`
- Provides the first operator-facing **Term Ledger** read model for the active or selected term.
- The current implementation is derived from `SessionTerm`, finance streams, and finance ledger entries rather than a persisted close/snapshot table.
- Response includes term/session identity, status label, account summaries, money in/out, available balance, deficit account count/amount, lifecycle metadata, and Admin-only close/reopen capability flags.
- Term close snapshots, carry-forward entries, and historical lock/reopen persistence remain planned follow-up work.

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
