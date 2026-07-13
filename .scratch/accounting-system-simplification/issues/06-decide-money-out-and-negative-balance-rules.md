Type: grilling
Status: done
Blocked by: 03, 04

## Question

How should expenses, salaries, service bills, and negative balances work?

Resolve:
- whether paying salary/service bills can make an account negative;
- whether negative balances are allowed, blocked, or represented as owing/deficit;
- how existing settlement-backed owing should relate to the simplified term-account model;
- whether money-out always belongs to the current term ledger or can be attributed to a paid-for term;
- how unpaid or partially funded payables should display in account balances;
- how corrections/cancellations affect account balance and term close readiness.

The answer should establish the default money-out behavior before internal transfer and closing rules are designed.

## Approved direction

Expenses post to the current open term ledger by default.

Salary/service payments may make an account negative only through controlled rules. The UI should show:

- available balance;
- pending payables;
- amount paid;
- deficit/owing.

Existing settlement-backed owing should remain the detailed payable engine. The simplified accounting UI should present it as **Needs Funding** or **Outstanding Payables**.

Term close should warn or block when deficits remain unresolved.
