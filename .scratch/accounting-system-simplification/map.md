## Destination

Produce an implementation-ready product and engineering plan for a simpler school accounting system where each term has a clear ledger/account view, money is separated into understandable accounts or pockets, income and expenses post into the right streams, payroll/wages/service/purchase workflows are handled cleanly, internal transfers can balance deficits, and term close carries surplus or deficit forward without losing the term a payment was originally for.

The map is complete when the team has decided the domain language, term lifecycle, stream/account model, transfer rules, payroll/wage/service payment structure, procurement/purchase accounting, inventory-linked profit tracking, closing/carry-forward behavior, late-payment attribution, UI workflows, API/schema implications, permissions, reconciliation, and rollout plan well enough to hand off implementation.

## Notes

- Planning only. Do not implement code while resolving this map unless a later ticket explicitly asks for a throwaway prototype artifact.
- This should be a separate Wayfinder effort from `.scratch/receive-payment-simplification/`. The receive-payment map is an input for the money-in workflow, but this effort covers the whole bursary/accounting operating model.
- Relevant current files and docs:
  - `.brain/features/student-fees.md`
  - `.brain/features/finance-operations.md`
  - `.brain/api/contracts.md`
  - `.brain/api/permissions.md`
  - `.brain/database/schema.md`
  - `.brain/database/relationships.md`
  - `.brain/tasks/account-finance-ui-rebuild-handoff.md`
  - `packages/db/src/schema/finance.prisma`
  - `apps/api/src/trpc/routers/finance.routes.ts`
  - `apps/api/src/db/queries/finance.ts`
  - `apps/dashboard/src/components/finance/`
  - `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`
- Existing finance model has school-scoped `FinanceStream`, `FinanceItem`, `FinanceCharge`, `FinancePayment`, `FinanceTransfer`, and `FinanceLedgerEntry`. Charges can carry session/term references; payments, transfers, and ledger entries currently rely more on stream/date/source than an explicit term ledger field.
- Current Brain docs already describe term-scoped accounting streams, settlements, reconciliation checks, report exports, and Admin/Accountant finance enforcement. The new plan should preserve existing ledger trust while simplifying the operator mental model.
- The accounting plan must include salary, wage, staff, non-staff, service, procurement, and purchase workflows. These should connect naturally to staff profiles where relevant and to account/project profitability where purchases later generate sales revenue, such as uniform production.
- Working naming hypothesis to test:
  - **Term Ledger**: the complete financial record for a term.
  - **Account**: user-facing money pocket/source/use of funds, likely backed by `FinanceStream`.
  - **Term Close**: locking or summarizing a completed term.
  - **Carry Forward**: moving net surplus or deficit into the next term.
  - **Collected in term**: when cash was actually received.
  - **Paid for term**: which academic term the payment obligation belongs to.

## Decisions so far

## Not yet specified

- Whether the current `FinanceStream` model should become term-owned, whether a new term-ledger layer should sit above it, or whether term balances can be derived safely from existing ledger entries.
- Whether closing a term should lock transactions, create summary rows, create carry-forward ledger entries, or only snapshot report totals.
- How much of this should be visible as accounting workflow versus kept as background finance integrity.
- Exact UI navigation and page layout for bursary/accounting workflows.
- Exact migration/compatibility rules for existing finance records.
- Whether this effort should produce a phased rollout plan, a direct implementation handoff, or a prototype first.
- Whether inventory-linked purchase/sale tracking belongs directly in finance v1 or as a finance-owned integration point with a later inventory module.

## Out of scope

- Full external accounting package parity, bank integrations, tax filing, or formal GAAP/IFRS reporting unless a later ticket proves they are required for the school workflow.
- Rebuilding the receive-payment sheet itself; that remains in `.scratch/receive-payment-simplification/`.
- Replacing the entire finance database model before proving which current concepts cannot support the desired workflow.
- Non-school financial products such as online payment gateway settlement, parent wallet top-ups, or ecommerce checkout.
