Type: grilling
Status: done
Blocked by: 01, 02

## Question

What is the lifecycle of a term ledger from opening to closing?

Resolve:
- what is created when a new term starts;
- whether every term starts with zero balances, carried-forward balances, or cloned account structures with opening balances;
- whether every account/pocket exists per term or whether accounts are school-wide with term-filtered balances;
- whether a term can receive new transactions after it is closed;
- what statuses a term ledger can have, such as draft, active, closing, closed, reopened;
- who can open, close, or reopen a term ledger;
- what must happen when the school switches the active dashboard term.

The answer should define the product lifecycle before transfer, payment, and reporting rules are finalized.

## Approved direction

Every academic term should have a **Term Ledger**.

Lifecycle:

- `Draft`: prepared before the term starts.
- `Open`: active term receiving normal transactions.
- `Closing`: review/reconciliation in progress.
- `Closed`: historical, read-only.
- `Reopened`: Admin-only correction state.

When a new term starts, it should copy/reuse the school's account structure and receive opening balances from carry-forward. Closed terms should remain readable and stable.
