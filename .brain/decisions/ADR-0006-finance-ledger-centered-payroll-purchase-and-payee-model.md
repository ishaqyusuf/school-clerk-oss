# ADR-0006: Finance Ledger-Centered Payroll, Purchase, and Payee Model

- Status: accepted
- Date: 2026-07-13

## Context
The simplified accounting work needs payroll, wages, casual labor, vendor purchases, reusable payees, product/project accounts, and staff/vendor history without making bursary operators manage a full general-ledger accounting package.

SchoolClerk already has standardized finance streams, charges, payments, allocations, transfers, and ledger entries. Those records drive account balances and term statements, so adding a second accounting source of truth would make reconciliation harder.

## Decision
Keep `FinanceLedgerEntry` as the source of truth for account balances and term statements.

- Model salary/wage rules as `FinancePayrollStructure`.
- Model vendors, casual workers, service providers, and reusable external recipients as `FinancePayee`.
- Model purchases, services, vendor bills, direct expenses, reimbursements, and labor as `FinancePurchase`.
- Link purchases and payroll obligations back to canonical `FinanceCharge` records.
- Link immediate purchase/payment settlement back to canonical `FinancePayment` and ledger entries.
- Use stream/account summaries for project-style profit tracking instead of introducing warehouse inventory requirements in v1.

## Consequences
### Positive
- Staff finance history, payee history, purchases, and payroll are explainable while balances still reconcile through one ledger path.
- Product/project accounts such as Uniforms or Books can show funding, costs, sales, and profit without needing full stock management first.
- Existing staff/service bill flows remain compatible because new relations are optional.

### Tradeoffs
- `FinancePurchase` is an accounting-context record, not a full procurement workflow with approvals, receiving, stock count, and invoice lifecycle.
- Audit reporting currently projects actor fields from canonical finance records rather than writing to a separate immutable audit-log table.
- Historical rows are not backfilled into payees/payroll/purchases unless a later migration explicitly maps them.

## Alternatives Considered
- Build a separate accounting module with independent journals and payables.
- Store vendors and purchases only in text fields on charges.
- Require inventory/warehouse implementation before product/project account reporting.

## Follow-up Actions
- Add richer correction/refund/cancellation workflows for purchases and payees.
- Add export-focused UI for payee history and project account summaries.
- Consider a dedicated immutable finance audit-event table if compliance needs exceed current canonical actor fields.
