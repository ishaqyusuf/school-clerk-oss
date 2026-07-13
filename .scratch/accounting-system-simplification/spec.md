Status: ready-for-agent

# Accounting System Simplification Spec

## Problem Statement

The current finance and accounting system is powerful but difficult for school bursary and accounting staff to operate. It exposes too much technical finance structure and does not yet give operators a simple mental model for each term's money: what came in, what went out, which accounts or pockets are funded, which accounts have deficits, how money was transferred, what was paid for a previous term, and what should carry forward.

Schools need a practical accounting system for day-to-day operations: student collections, salary and wage payments, service bills, purchases, vendor payments, internal transfers, project/product accounts such as uniforms, arrears, term close, carry-forward, reports, and staff/vendor history. The system should feel like a school bursary workspace, not an external general-ledger package.

## Solution

Create a term-based accounting model centered on **Term Ledgers** and user-facing **Accounts**.

- A **Term Ledger** is the complete financial record for one academic term.
- An **Account** is a user-facing money pocket/source/use of funds, backed internally by the existing account/stream model.
- Money can be collected into accounts, spent from accounts, moved between accounts, and summarized at term close.
- Every payment distinguishes **collected in term** from **paid for term**.
- Term close snapshots the term and carries account-level surplus or deficit into the next term without erasing history.
- Salary, wages, staff payments, non-staff labor, service payments, purchases, vendor bills, reimbursements, and project/product profit tracking become first-class accounting workflows.

This is a practical school cash-management ledger, not a full external accounting package. The system should preserve current finance trust and reporting while simplifying language and workflows for operators.

## User Stories

1. As an accountant, I want a Term Ledger for each academic term, so that I can understand that term's money separately.
2. As an accountant, I want to see the current term's money in, money out, balance, deficit, and arrears, so that I can manage daily bursary work.
3. As an accountant, I want old terms to remain readable after close, so that I can audit previous records.
4. As an admin, I want to close a term, so that the school can finalize records and move surplus or deficit forward.
5. As an admin, I want to preview term close before confirming it, so that I can review warnings and balances first.
6. As an admin, I want close checks for deficits, pending payables, unresolved transfers, and ledger mismatches, so that mistakes are caught before a term is finalized.
7. As an admin, I want to reopen a closed term only through an admin correction flow, so that historical records stay protected.
8. As an accountant, I want every account to show available balance, pending payables, amount paid, and deficit/needs funding, so that I know what action is needed.
9. As an accountant, I want accounts like School Fees, PTA, Books, Salary, Service Bills, Operations, and Uniforms, so that money is separated into understandable pockets.
10. As an accountant, I want to transfer funds from one account to another, so that I can fund salary, purchases, or service bills from available money.
11. As an admin, I want large or override transfers to require admin authority, so that major fund movement is controlled.
12. As an accountant, I want a transfer to appear in both account statements, so that the source and destination are easy to trace.
13. As an accountant, I want a reason or note on each transfer, so that fund movement can be audited later.
14. As an accountant, I want a student's payment collected this term for last term to show both terms, so that cash reporting and arrears reporting are not confused.
15. As an accountant, I want receipts to show payment date, collected-in term, paid-for term, account, and amount, so that parents and school staff understand the record.
16. As an accountant, I want previous-term arrears visible in the current bursary workspace, so that late payments can be collected without reopening old terms.
17. As an accountant, I want closed terms to avoid direct new cash ledger entries, so that historical reports stay stable.
18. As an accountant, I want expenses to post to the current open term ledger by default, so that money-out records follow the term being operated.
19. As an accountant, I want salary and service payments to show deficits when an account lacks funds, so that the school can fund them through transfers.
20. As an accountant, I want existing settlement-backed owing to appear as Needs Funding or Outstanding Payables, so that complex finance state is understandable.
21. As an accountant, I want salary structures for staff, so that recurring staff payments can be generated consistently.
22. As an accountant, I want teaching and non-teaching staff to share one salary structure system, so that payroll is consistent while still filterable by role.
23. As an accountant, I want wages for daily, hourly, or task-based workers, so that casual labor can be paid properly.
24. As an accountant, I want allowances, deductions, advances, and bonuses, so that staff pay reflects the real arrangement.
25. As an accountant, I want one-off labor payments for non-staff workers, so that casual payees are not forced into staff records.
26. As an accountant, I want reusable payees for non-staff labor and vendors, so that repeat payments are traceable.
27. As a staff admin, I want salary and wage history visible on staff profiles, so that a staff member's finance record is easy to inspect.
28. As an accountant, I want staff profiles to show unpaid salary, advances, deductions, and payment receipts, so that staff finance questions can be answered quickly.
29. As an accountant, I want salary and wage payments to normally use a Salary/Wages Account, so that staff payment funding is clear.
30. As an accountant, I want to record a purchase, so that buying school goods or materials appears in the accounting system.
31. As an accountant, I want to record a service payment, so that paying for work like tailoring, repairs, or transport is traceable.
32. As an accountant, I want to record a vendor bill before payment, so that unpaid obligations are visible.
33. As an accountant, I want to record a direct expense, so that immediately paid purchases are quick.
34. As an accountant, I want to record reimbursements, so that staff or others can be paid back for school expenses.
35. As an accountant, I want purchases to include vendor, description, quantity, unit cost, total amount, funding account, term ledger, receipt/reference, and notes, so that records are complete.
36. As an accountant, I want purchases to appear in account statements, so that spending history is visible from the account view.
37. As an accountant, I want purchase cancellations, refunds, and corrections, so that mistakes can be fixed with an audit trail.
38. As an accountant, I want product/project accounts like Uniform Account or Books Account, so that resale activities can be tracked separately.
39. As an accountant, I want to transfer money into a Uniform Account, buy cloth, pay tailors, sell uniforms, and see the resulting balance, so that the school can understand profit or loss.
40. As an accountant, I want student uniform or book sales to return money to the related product account, so that income and cost meet in the same place.
41. As an accountant, I want purchase cost, production/labor cost, sales income, remaining balance, and profit/loss shown per product account, so that resale activities are manageable.
42. As an accountant, I want inventory-linked accounting hooks without requiring a full warehouse system in v1, so that finance can move forward without overbuilding inventory.
43. As an accountant, I want the receive-payment flow to connect to product/payment accounts, so that books, uniforms, and similar sales are recorded correctly.
44. As an accountant, I want vendor and payee records to show purchases paid, unpaid bills, total paid, related accounts, and receipts, so that repeat payees are easy to manage.
45. As an accountant, I want the main finance workspace to remain the source of truth, so that profile surfaces do not fragment records.
46. As an admin, I want accountants to view ledgers, receive money, pay money, and make normal transfers, so that daily bursary work does not require owner access.
47. As an admin, I want only admins to close terms, reopen terms, and post after-close corrections, so that final financial records are protected.
48. As an admin, I want activity logs for payments, transfers, close runs, carry-forward, reopen actions, and corrections, so that every important finance action is traceable.
49. As an accountant, I want reports and exports for term ledgers, accounts, purchases, payroll, payables, arrears, and reconciliation, so that the school can review finances outside the app.
50. As a school owner, I want the system to remain compatible with existing student fees, payables, settlements, transfers, receipts, and ledger entries, so that current data is not lost.
51. As a school owner, I want the new accounting model rolled out in phases, so that core finance work remains stable during the transition.

## Implementation Decisions

- Use **Term Ledger** as the operator-facing term financial record.
- Use **Account** as the operator-facing money pocket; keep stream terminology internal.
- The system is a practical school cash-management ledger, not a full external accounting or general-ledger product.
- A term ledger lifecycle should include Draft, Open, Closing, Closed, and Reopened.
- New terms should copy or reuse the school's account structure and receive opening balances from carry-forward.
- Closed terms should remain readable and stable.
- User-facing Account maps to the internal finance account/stream concept, but balances must be term-aware.
- Do not show CREDIT/DEBIT to users. Use Money In, Money Out, Transfer, Deficit, Needs Funding, and Available Balance.
- Accounts may go negative only through controlled rules, and the UI should present that as Deficit or Needs Funding.
- Every student payment must distinguish the term where cash was collected from the term the debt/payment was for.
- Late payments after close should be collected in the current term ledger while still allocating against the previous-term obligation.
- Closed previous terms should not receive direct new cash ledger entries.
- Expenses post to the current open term ledger by default.
- Settlement-backed owing remains the detailed payable engine, but the simplified accounting UI should present it as Needs Funding or Outstanding Payables.
- Internal transfers are the standard way to fund one account from another.
- Transfers require a source account, destination account, amount, and note/reason.
- Large or override transfers preserve admin approval rules.
- Transfers after term close require reopening or correction flow.
- Term close should run reconciliation checks, snapshot each account balance, summarize surplus/deficit per account, create carry-forward opening entries for the next term, and keep old statements readable.
- Carry-forward should happen per account, not only as one school-wide net amount.
- Salary and wages should use one payroll engine with payment types for salary, wage, allowance, deduction, advance, bonus, and one-off labor payment.
- Teaching and non-teaching staff share one salary structure system, filterable by category or role.
- Non-staff casual workers and vendors should be reusable Payees, not forced into staff profiles.
- Staff profiles should expose salary structure, salary/wage history, advances, deductions, unpaid balances, and payment receipts/history.
- Salary/wage payments normally use a Salary/Wages Account, with transfers used to fund shortages.
- Purchase workflows must distinguish Purchase, Service Payment, Vendor Bill, Direct Expense, and Reimbursement.
- Purchases require vendor/payee, description, quantity where needed, unit or total cost, funding account, term ledger, payment status, receipt/reference, and notes.
- Purchases may be paid immediately or recorded first as unpaid payables.
- Product/project accounts should support activities like Uniforms and Books where the school spends money, sells items, and wants profit/loss visibility.
- V1 should avoid building a full warehouse inventory system unless needed. It should build accounting hooks for purchase cost, labor/production cost, sales income, remaining balance, and profit/loss per account/project.
- Uniforms, books, and similar resale items should connect to the simplified receive-payment flow as payment types/items.
- Vendor and payee finance history should appear in compact reusable payee surfaces, while the main finance workspace remains the source of truth.
- Likely domain additions include a term-ledger model, term/account balance snapshots or carry-forward records, close-run audit records, and explicit term ownership on ledger/payment/transfer records.
- Useful API surfaces include term ledger overview, account list, account statement, transfer funds, term close preview, close term, reopen term, carry-forward preview, payroll/wage operations, purchase/vendor operations, and project-account profit views.
- Migration must interpret existing records carefully and avoid rewriting history casually.
- Existing student fee, payment, charge, transfer, settlement, reconciliation, and receipt behavior must remain compatible.

## Testing Decisions

- Primary test seams should be finance API/read-model behavior and user-facing workflow behavior, because the feature value is term/account accuracy and operator-visible accounting outcomes.
- Add term-ledger API tests for opening term ledgers, listing term accounts, computing balances, and reading account statements.
- Add term attribution tests for payments collected in one term and paid for another.
- Add term close preview and close tests for snapshots, carry-forward entries, deficits, unresolved payables, and read-only closed-term behavior.
- Add reopening/correction tests for admin-only behavior and audit log creation.
- Add transfer tests for normal transfers, insufficient-fund handling, large transfer permissions, both-sided account statement entries, and after-close restrictions.
- Add money-out tests for salary/service payments, negative balance presentation, settlement-backed owing, and cancellation/correction effects.
- Add payroll tests for salary structures, wages, allowances, deductions, advances, one-off labor payments, unpaid salary, and staff profile history.
- Add payee tests for reusable non-staff workers and vendors.
- Add procurement tests for immediate purchases, unpaid vendor bills, service payments, reimbursements, refunds, and account statement effects.
- Add product/project accounting tests for uniform/book-style flows: transfer funding, purchase costs, labor costs, student sales, balance, and profit/loss.
- Add permission tests for Admin and Accountant boundaries across view, receive, pay, transfer, close, reopen, override, and corrections.
- Add reconciliation tests for pre-close blockers and warnings: missing ledger terms, negative accounts, pending payables, unresolved transfers, cancelled rows with active ledger effects, and unmatched carry-forward.
- UI workflow tests should cover term overview, account list, account statement, receive money, pay money, transfer funds, arrears, term close, reports, staff finance history, and payee history.
- Tests should assert externally visible outcomes and persisted accounting effects, not internal component state.
- Prefer existing finance API, ledger, payment, permission, and reconciliation test patterns where available.

## Out of Scope

- Full external accounting package parity, bank integration, tax filing, GAAP/IFRS reporting, or formal double-entry accounting beyond what the school workflow requires.
- Replacing the entire finance data model before proving which current concepts cannot support the approved workflows.
- Building a full inventory warehouse/stock-control system in v1 unless later planning explicitly expands scope.
- Online payment gateway settlement, parent wallet top-ups, ecommerce checkout, or bank reconciliation integrations.
- Rebuilding the receive-payment sheet details inside this spec; that is covered by the receive-payment simplification spec and should integrate into this accounting model.

## Further Notes

- The receive-payment simplification spec is a key input to this accounting system because student collections must post into the correct account and term ledger.
- The accounting rollout should be phased: glossary/product model, term-ledger read model, term attribution, overview and account statements, transfers and deficits, payroll/procurement, term close/carry-forward, reconciliation, reports, and documentation.
- Brain documentation should be updated during implementation for finance operations, student fees, API contracts, permissions, database schema/relationships, and any durable architecture decision that changes accounting persistence.
