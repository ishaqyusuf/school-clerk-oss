## Destination

Produce a clear implementation-ready product and engineering plan for simplifying the Receive Student Payment sheet so collectors can record common payments through a short, guided flow: choose a student, choose a payment type from school-configured options, choose or create a description/item, confirm amount paid, and submit.

The map is complete when the team has decided the domain model, UI flow, creation behavior, permissions, and compatibility rules well enough to hand off implementation without re-litigating the payment workflow.

## Notes

- Planning only. Do not implement code while resolving this map unless a later ticket explicitly asks for a throwaway prototype artifact.
- Relevant current files:
  - `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`
  - `apps/dashboard/src/components/finance/forms/add-fee-sheet.tsx`
  - `apps/api/src/trpc/routers/finance.routes.ts`
  - `apps/api/src/db/queries/finance.ts`
  - `packages/db/src/schema/finance.prisma`
  - `.brain/features/student-fees.md`
  - `.brain/api/permissions.md`
- Current receive-payment behavior includes student search/create, payment metadata, term payables, auto allocation, manual stream rows, item suggestions, receipt actions, and fee creation. The redesign should intentionally decide what remains visible, what becomes progressive disclosure, and what is moved out of the happy path.
- Existing finance concepts in play:
  - `FinanceStream`: account/stream receiving ledger entries.
  - `FinanceItem`: school-configured charge item with type, name, description, amount, stream, collectable flag, term/session scope, and classroom applicability.
  - `FinanceCharge`: student/staff/school charge record.
  - Existing student payment API can create manual student charges when no charge id is supplied in allocation.
- Current finance route enforcement allows finance routes to `Admin` and `Accountant`; the simplified creation features may need narrower permission decisions.
- User goal: remove bulk from the sheet, hide advanced controls, and support quick collection for configured school payment types such as tuition, books, PTA, levy, and other school-defined items.

## Decisions so far

## Not yet specified

- Exact implementation ticket sequence after the decisions are resolved.
- Whether the simplified flow replaces the current sheet entirely or coexists behind a new mode until parity is proven.
- Detailed QA matrix for payment receipt, student balance, finance stream/account balance, and role-permission regression.
- Final UI copy for every field and empty state.

## Out of scope

- Rebuilding the whole finance IA, account/stream pages, or fees management page.
- Changing the database schema unless the model ticket proves current `FinanceStream`/`FinanceItem`/`FinanceCharge` contracts cannot support the desired workflow.
- Reworking non-student payment flows such as staff payroll, service bills, or internal transfers.
