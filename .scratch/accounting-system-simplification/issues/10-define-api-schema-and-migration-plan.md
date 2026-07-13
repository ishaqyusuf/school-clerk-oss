Type: research
Status: open
Blocked by: 02, 03, 04, 05, 06, 07, 08, 13, 14, 15, 16

## Question

What API, schema, read-model, and migration changes are needed for the simplified accounting system?

Resolve:
- whether new models are needed for term ledgers, account definitions, account snapshots, close runs, carry-forward entries, or payment attribution;
- whether existing `FinanceStream`, `FinanceLedgerEntry`, `FinancePayment`, and `FinanceTransfer` can be extended safely;
- required API endpoints for term ledger overview, account statements, transfers, term close, reopen/correction, and reporting;
- how existing records should be migrated or interpreted;
- how old finance pages and receive-payment behavior stay compatible;
- whether Prisma migration work is required.

The answer should become the technical contract for implementation planning.

## Approved direction

Keep `FinanceStream` as the account definition, but add term-ledger ownership/snapshots.

Likely needs:

- `FinanceTermLedger`;
- term/account balance snapshot or carry-forward records;
- term reference on ledger entries/transfers/payments, or a direct `termLedgerId`;
- close-run records for audit.

Useful APIs:

- `finance.getTermLedger`;
- `finance.listTermAccounts`;
- `finance.getAccountStatement`;
- `finance.transferFunds`;
- `finance.previewTermClose`;
- `finance.closeTerm`;
- `finance.reopenTerm`;
- `finance.getCarryForwardPreview`.

Migration should interpret existing records carefully and not rewrite history casually.
