Status: ready-for-agent

# Receive Payment Simplification Spec

## Problem Statement

The current Receive Student Payment form works, but it exposes too many finance controls to ordinary operators. Collectors must deal with term tables, stream allocations, manual rows, suggestions, outstanding item lists, metadata, and fee creation controls all at once. This makes a normal payment collection feel like a finance-admin task instead of a cashier workflow.

Operators need a simpler experience: choose the student, choose what the student is paying for, confirm the amount, collect the money, and print or download the receipt. The system must still preserve the existing finance accuracy behind the scenes: student balances, account/stream ledger entries, receipts, historical terms, partial payments, and permission rules must continue to work.

## Solution

Replace the default Receive Student Payment experience with a short guided flow:

1. Select or confirm the student.
2. Select or quick-create a **Payment Type**.
3. Select or type a **Description** under that payment type.
4. Load or enter the price.
5. Enter the amount paid.
6. Confirm payment method, date, and optional reference.
7. Submit and show receipt actions.

Payment Type is an operator-facing category backed by existing finance configuration. It is built from school-configured collectable finance items and their accounts/streams. The internal finance model should continue using stream/account, item, charge, payment, allocation, and ledger concepts, but the UI should not expose that complexity by default.

Quick-create must support two creation modes:

- **Simple collection**: creates a reusable cashier-style payment category that appears in future payment lists but does not automatically apply charges to students.
- **School fee**: uses the existing fee setup behavior so the fee can apply to one student, a class, selected classes, or the whole school.

The old bulky controls should remain available through an **Advanced** mode during rollout so existing edge cases are not lost.

## User Stories

1. As an accountant, I want to open receive payment and immediately search for a student, so that I can collect payment without navigating through multiple finance pages.
2. As an accountant, I want a preselected student when I open the sheet from a student profile, so that I do not search for the same student again.
3. As an accountant, I want to choose a payment type like Tuition, Books, PTA, Levy, or Uniform, so that I can quickly classify what the student is paying for.
4. As an accountant, I want the payment type list to show only configured school options by default, so that old or irrelevant options do not clutter the form.
5. As an accountant, I want outstanding student items to appear first, so that I can collect the most urgent balances quickly.
6. As an accountant, I want current-term school fees to appear in the list, so that I can collect configured fees without manual setup.
7. As an accountant, I want class-applicable fee items to appear for the selected student, so that I do not accidentally collect the wrong class fee.
8. As an accountant, I want previously created simple collection types to appear, so that common one-off collections can be reused.
9. As an accountant, I want to type a new payment type and create it when it does not exist, so that I can collect a payment that the school has not configured yet.
10. As an accountant, I want to choose whether a new payment type is a Simple collection or School fee, so that the system knows whether it should apply to other students.
11. As an admin, I want School fee creation to reuse the existing fee behavior, so that class and school-wide application rules remain consistent.
12. As an admin, I want Simple collection creation to avoid auto-applying charges, so that cashier categories do not accidentally bill students.
13. As an accountant, I want to select an existing description under a payment type, so that I can reuse items like a specific book title or uniform item.
14. As an accountant, I want to type a new description under a payment type, so that I can collect for a new item without leaving the form.
15. As an accountant, I want a selected description to load the configured price, so that I do not retype known amounts.
16. As an accountant, I want the amount paid to default to the outstanding amount when a charge exists, so that partial and full payments are easy.
17. As an accountant, I want the amount paid to default to the configured item price when no charge exists, so that simple collections are quick.
18. As an accountant, I want to override the amount paid where allowed, so that partial payments and adjusted payments can be recorded.
19. As an accountant, I want payment date to default to today, so that normal collections require fewer clicks.
20. As an accountant, I want payment method to default to the school or user's usual method where available, so that common workflows are faster.
21. As an accountant, I want reference and notes to be optional, so that simple cash collections are not slowed down.
22. As an accountant, I want advanced metadata hidden by default, so that the main form stays compact.
23. As an accountant, I want to submit one clear payment intent, so that I do not manually allocate streams unless I choose Advanced.
24. As an accountant, I want receipt actions immediately after a successful payment, so that I can print or download without searching payment history.
25. As an accountant, I want the student balance to update after payment, so that I can confirm the payment affected the correct debt.
26. As an accountant, I want the account/stream ledger to update after payment, so that finance reports remain accurate.
27. As an accountant, I want duplicate payment type creation to be blocked or matched, so that school settings stay clean.
28. As an accountant, I want duplicate description creation to suggest the existing item, so that operators do not create many versions of the same book or fee.
29. As an admin, I want to restrict reusable payment-type creation, so that ordinary operators do not create messy school finance settings.
30. As an admin, I want account staff to receive payments without full admin access, so that daily collection work can continue.
31. As an accountant, I want one-off manual collections to remain possible where permitted, so that unusual payments can still be recorded.
32. As an accountant, I want existing outstanding charges and legacy balances preserved, so that older student records do not disappear.
33. As an accountant, I want Advanced mode for multiple outstanding lines, so that complex payments can still be handled.
34. As an accountant, I want Advanced mode for historical term payments, so that arrears can still be managed.
35. As an accountant, I want Advanced mode for manual allocation and corrections, so that finance-admin tasks remain possible.
36. As an accountant, I want inactive or previous-term items hidden unless the student has an outstanding balance, so that the default list stays clean.
37. As an accountant, I want the form to reset when the student changes, so that one student's payment state does not leak into another.
38. As an accountant, I want the description and amount to reset when the payment type changes, so that payment details stay consistent.
39. As an accountant, I want clear validation errors, so that I can fix missing student, payment type, description, amount, method, or date quickly.
40. As an admin, I want audit/activity logs when payment or reusable configuration is created, so that finance changes remain traceable.
41. As a school owner, I want the simplified receive-payment workflow to stay compatible with the broader accounting system, so that money collected through the sheet appears in the right term ledger and account.

## Implementation Decisions

- Payment Type is a presentation model over the existing finance configuration, not a new standalone database concept.
- User-facing Payment Types are built from active, collectable school finance items and their backing accounts/streams.
- The Description selector lists configured or previous items under the selected payment type.
- Built-in/common labels such as Tuition, Books, PTA, Levy, and Uniform are quick-create suggestions, not forced default options.
- Quick-create for a new payment type must ask whether the type is **Simple collection** or **School fee**.
- Simple collection creates a reusable cashier category, appears in future payment type lists, and does not auto-apply charges.
- School fee creation must reuse the existing fee setup behavior, including one-student, class, selected-class, or school-wide application.
- The default selector should include active collectable student-payable items, current-term and reusable/global items, student-class-applicable items, existing outstanding student charges, and prior simple collection categories.
- Inactive, deleted, or previous-term records should be hidden by default unless the selected student has an outstanding balance against them.
- Duplicate options collapse into one operator-facing payment type where possible, with individual configured items appearing under descriptions.
- Default flow is student, payment type, creation mode when needed, description, price, amount paid, method/date/reference, submit, receipt.
- The current term accordion, full payable table, select-all pending action, manual stream allocation rows, purchase suggestion panel, and multi-line allocation controls move behind Advanced.
- Advanced mode preserves historical term payments, multi-line allocation, legacy unapplied balances, and manual correction paths during rollout.
- Add-new description/item writes a reusable item under the selected payment type where permitted; one-off payments should avoid polluting reusable school settings.
- The UI should submit a simplified intent rather than forcing the client to orchestrate every allocation detail.
- A focused receive-payment options read model should return student context, current term/class, payment types, suggestions, outstanding references, defaults, and permission flags.
- A simplified submit wrapper should translate the guided form into the existing allocation, charge, payment, and ledger model.
- Existing receive-payment services can remain the lower-level engine, but the simplified sheet should not be responsible for composing many endpoints directly.
- Receive payment is available to Admin and Accountant.
- Creating school fees is Admin-only by default.
- Creating reusable simple collection types or reusable descriptions is Admin-only by default unless explicitly opened to Accountant.
- One-off/manual student charges remain available to Admin and Accountant where current finance permissions allow.
- Server validation must enforce tenant ownership, student ownership, term/session validity, classroom applicability, stream/item ownership, duplicate prevention, positive amount, and overpayment policy.
- Payment receipt, student balance, account/stream balance, and activity logs must remain compatible with existing finance reporting.

## Testing Decisions

- Primary test seam should be the receive-payment workflow and the finance API contract, because the value is external behavior: options shown, amount defaulting, payment submission, ledger/balance effects, and receipts.
- Add API contract tests for payment option loading: configured fees, simple collections, outstanding items, class filtering, inactive item hiding, and duplicate collapse.
- Add submit tests for existing charge payment, configured item without charge, simple collection, school-fee-backed payment, partial payment, and one-off/manual collection.
- Add permission tests for receive payment, simple collection creation, school fee creation, reusable description creation, and one-off manual charge creation.
- Add validation tests for missing fields, duplicate payment type/item, invalid classroom applicability, invalid term ownership, and amount safety.
- Add UI-level tests for the happy path: select student, select payment type, select description, amount defaults, submit, receipt action appears.
- Add UI-level tests for quick-create payment type and quick-create description.
- Add regression tests that Advanced mode still exposes legacy multi-line or manual allocation behavior where required.
- Tests should assert visible behavior and persisted finance effects, not internal component state.
- Existing finance payment, charge, student balance, and permission test patterns should be reused where possible rather than creating a parallel test style.

## Out of Scope

- Rebuilding the whole Account & Finance information architecture.
- Rebuilding term-ledger accounting, payroll, procurement, purchase, or inventory accounting in this spec.
- Replacing the finance database model unless implementation proves current stream/item/charge/payment contracts cannot support the workflow.
- Removing legacy receive-payment capabilities before Advanced mode has proven compatibility.
- Building an external payment gateway or parent checkout flow.

## Further Notes

- This spec is related to, but separate from, the broader accounting system simplification spec. The receive-payment flow should eventually feed collected payments into the correct term ledger and account model.
- The rollout should prefer preserving the old power-user behavior behind Advanced first, then further hiding or removing it only after operator feedback confirms the simplified flow covers daily work.
