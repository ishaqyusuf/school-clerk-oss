Type: grilling
Status: open
Blocked by: 04, 06, 07

## Question

How should school purchases, vendor payments, and service payments work in the simplified accounting system?

Resolve:
- the difference between a service payment, purchase, vendor bill, reimbursement, and operational expense;
- whether purchases can be made directly from any account or only from specific expense/procurement accounts;
- how a purchase chooses the funding account;
- how transfers should fund a purchase account before spending;
- whether a purchase can create an unpaid payable first, a direct paid expense, or both;
- what purchase details are required, such as vendor, item/service, quantity, unit cost, account, term, receipt/reference, and notes;
- how purchase records appear in account statements and reports;
- how purchase cancellations, refunds, and corrections work.

The answer should define the default purchase/payment workflow before inventory-linked accounting and API planning.

## Initial direction from user input

The school should be able to make purchases from money in its accounts and move money from different accounts to fund purchases. Examples include buying uniform cloth in bulk and paying tailors for sewing work.

## Approved direction

Create a clear purchase/payment workflow for school expenses.

Use these meanings:

- **Purchase**: buying goods/materials, like uniform cloth, books, or stationery.
- **Service Payment**: paying for work/service, like tailoring, repairs, or transport.
- **Vendor Bill**: unpaid obligation to a vendor.
- **Direct Expense**: immediate paid expense.
- **Reimbursement**: paying someone back for a school expense.

A purchase should require:

- vendor/payee;
- item/service description;
- quantity where needed;
- unit cost or total amount;
- funding account;
- term ledger;
- payment status;
- receipt/reference;
- notes.

Purchases can be paid immediately or recorded first as unpaid payables. The account statement should show the purchase as money out from the selected account.
