Type: research
Status: open
Blocked by:

## Question

How well does the current finance model support the proposed term-based accounting system?

Audit the current schema, queries, and Brain docs for:
- how `FinanceStream`, `FinanceItem`, `FinanceCharge`, `FinancePayment`, `FinanceTransfer`, and `FinanceLedgerEntry` currently work;
- where session/term references exist today and where they are missing;
- how current balances are calculated;
- how student payments, service/payroll payables, settlements, internal transfers, cancellations, and reconciliation reports are represented;
- whether current `FinanceStream` records behave like term accounts, school-wide accounts, or reusable account definitions;
- risks in deriving term balances only from dates and source records;
- compatibility constraints from existing finance UI routes and receive-payment behavior.

The answer should identify which requirements are already supported, which need a read-model change, and which likely require schema or lifecycle changes.

## Approved direction

The current model supports the foundation, but needs a clearer term-ledger layer.

Already useful:

- `FinanceStream` can become the internal backing for Accounts.
- `FinanceLedgerEntry` already records money movement.
- `FinanceTransfer` already supports account-to-account movement.
- `FinanceCharge` already has session/term references.

Gaps:

- `FinancePayment`, `FinanceTransfer`, and `FinanceLedgerEntry` need clearer term ownership.
- Current streams look school-wide, not term-owned.
- Term close/carry-forward likely needs snapshots or close-run records.
- The system should not rely only on dates to decide which term owns a cash movement.
