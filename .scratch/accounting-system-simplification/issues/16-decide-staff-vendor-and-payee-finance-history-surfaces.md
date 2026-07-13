Type: prototype
Status: done
Blocked by: 13, 14

## Question

Where should salary, wage, service, purchase, and vendor payment history appear in the product?

Resolve:
- what finance history should appear on a staff profile;
- whether non-staff payees/vendors need their own profile or compact payee history;
- how salary structure, wage records, advances, deductions, and payments should appear for staff;
- how service providers, tailors, vendors, and other payees should be searched and reused;
- whether purchase/service history should appear only in finance or also in staff/vendor profile contexts;
- what the operator should see when opening a staff member, vendor, or account statement;
- what belongs in the main bursary workflow versus profile-level history.

The answer should produce rough surface-level UI guidance before the broader bursary workflow prototype is finalized.

## Initial direction from user input

Salary and wage activity should also appear in the staff profile. The system should preserve records for every purchase and service/labor payment so the bursary/accounting team can trace who was paid, what was purchased, and which account funded the activity.

## Approved direction

Finance history should appear where users naturally look for it.

Staff profile should show:

- salary structure;
- salary payments;
- wage payments;
- advances/deductions;
- unpaid balances;
- payment history by term.

Vendors/non-staff payees should have a compact reusable payee record showing:

- services/purchases paid;
- unpaid bills;
- total paid;
- related account;
- receipts/references.

The main finance workspace remains the source of truth, but staff/vendor profiles should provide context history so operators do not have to search the full ledger every time.
