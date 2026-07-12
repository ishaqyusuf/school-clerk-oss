# Stream Funding and Payables

## Overview
Finance streams now track more than raw cash movement. Each stream has:

- `Available funds`: actual wallet cash from successful credits/transfers in minus successful debits/transfers out
- `Pending payables`: bills assigned to the stream that have not yet been issued for payment
- `Outstanding owing`: amounts already issued to a staff/service payable but not yet covered by stream cash
- `Active billables`: current `BillableHistory` rows assigned to the stream

This keeps cash accounting separate from payable accounting while still letting the stream overview show the full operational picture.

## Core Lifecycle

### 1. Payable creation
- Creating a payroll bill or service expense creates a `Bills` row linked to a stream wallet.
- That bill appears as a pending payable on the stream detail page even before any wallet transaction exists.

### 2. Funding a stream
- `finance.addFund` and `finance.transferFunds` increase stream cash availability through `WalletTransactions`.
- Stream `balance` continues to represent actual cash only.

### 3. Issuing payment
- `finance.payStaffBill` and `finance.payServiceBill` now issue payment against available stream cash first.
- Requested payout amount is stored on `BillPayment.amount`.
- Actual cash deducted from the stream is stored on the linked `WalletTransactions.amount`.
- If cash is insufficient, the uncovered remainder is stored as outstanding owing on `BillSettlement.owingAmount`.

### 4. Repaying owing
- `finance.repayBillOwing` creates a debit transaction on the same stream, records a `BillSettlementRepayment`, and reduces the outstanding owing amount on the linked settlement.
- Repayment is capped by:
  - available stream funds
  - requested repayment amount
  - current outstanding owing

### 5. Cancellation
- Cancelling a staff/service bill payment now:
  - marks the original funding transaction as cancelled
  - marks any repayment transactions for that bill as cancelled
  - soft-deletes the linked payment and invoice rows
- The bill returns to the pending-payable state.

## Stream Read Models

### `finance.getStreams`
Returns stream cash plus liability projections:

- `totalIn`
- `totalOut`
- `balance`
- `pendingBills`
- `owingAmount`
- `activeBillables`
- `projectedBalance`

`projectedBalance = balance - pendingBills - owingAmount`

### `finance.getStreamDetails`
Returns:

- stream cash totals
- pending bill totals
- owing totals
- active billables totals
- `transactions[]` for cash-only records
- `records[]` for unified stream records

`records[]` includes:

- wallet transaction records
- pending/paid/owing bill records
- active billable records

This is what powers the stream overview table so every stream-linked record is visible in one place.

## UI State Semantics

### Payroll and Service Payments
- `Pending`: no active successful payment has been issued
- `Paid`: payment issued and no outstanding owing remains
- `Paid with owing`: payment issued, but part of the payout still sits as stream owing
- `Cancelled`: payment was reversed and the payable reopened

### Stream Overview
- `Available Balance`: actual stream cash
- `Projected Balance`: available balance after pending bills and owing
- `Open Bills`: unpaid payables
- `Outstanding Owing`: already-issued amounts awaiting funding cover
- `Active Billables`: current stream-linked billable definitions

## Implementation Notes
- `WalletTransactions` remains the source of truth for cash.
- `Bills` remains the source of truth for pending payables.
- `BillSettlement` is the source of truth for requested amount, funded amount, remaining owing, and payable settlement status.
- `BillSettlementRepayment` records each later repayment transaction against a payable settlement.
- `BillInvoice` remains present for backward compatibility with older rows while settlement-backed reads are phased in.
