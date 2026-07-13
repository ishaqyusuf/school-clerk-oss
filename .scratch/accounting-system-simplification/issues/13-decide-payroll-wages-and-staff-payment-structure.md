Type: grilling
Status: open
Blocked by: 04, 06

## Question

How should salary, wages, teaching-staff payments, non-teaching-staff payments, and casual/non-staff labor payments work?

Resolve:
- the difference between salary, wage, allowance, bonus, deduction, advance, and one-off labor payment;
- whether teaching and non-teaching staff share one salary structure or separate structures;
- how casual workers or non-staff payees should be represented when they are not staff profiles;
- whether salary structures are fixed per term, per month, per staff role, or per staff member;
- how generated salary/wage obligations become payable records;
- how partial salary payments, unpaid salary, advances, and corrections should affect account balances;
- how salary/wage history appears on staff profiles;
- which account funds salary/wage payments by default and how transfers can fund shortages.

The answer should define the payroll/wage domain before API, UI, and permissions are finalized.

## Initial direction from user input

The accounting system must include salary and wage management for teaching staff, non-teaching staff, and non-staff/casual labor where needed. Salary/wage records should connect to staff profiles when the payee is a staff member and should remain visible as part of the staff finance history.

## Approved direction

Use one payroll engine, but support different payment types.

Definitions:

- **Salary**: recurring structured pay for staff.
- **Wage**: daily/hourly/task-based pay, including casual workers.
- **Allowance**: extra staff benefit.
- **Deduction**: amount removed from staff pay.
- **Advance**: money paid early and recovered later.
- **One-off labor payment**: payment to a non-staff worker.

Teaching and non-teaching staff should share the same salary structure system, but be filterable by staff category/role.

Staff profile should show:

- salary structure;
- salary/wage history;
- advances;
- deductions;
- unpaid salary;
- payment receipts/history.

Non-staff casual workers should be saved as reusable **Payees**, not forced into staff profiles.

Salary/wage payments should normally come from a Salary/Wages Account. If the account has insufficient funds, the user should transfer money into it before payment or record the unpaid balance as **Needs Funding**.
