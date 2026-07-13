Type: grilling
Status: open
Blocked by: 04, 06

## Question

How should internal transfers between accounts work in the simplified accounting system?

Resolve:
- when a user transfers funds from one account/pocket to another;
- whether transfers can be made from accounts with insufficient funds;
- whether transfers are required to clear negative balances before term close;
- how transfer notes, approvals, and audit logs should work;
- whether transfer reversals/cancellations are allowed after term close;
- how transfer entries appear in each account statement and the overall term ledger;
- whether large transfers keep the current Admin-only approval threshold behavior.

The answer should define the bursary workflow for moving money between accounts like School Fees, PTA, Salary, and Operations.

## Approved direction

Transfers are the clean way to fund one account from another.

Example: transfer from School Fees Account to Salary Account.

Rules:

- source account decreases;
- destination account increases;
- note/reason required;
- large transfers keep Admin-only approval threshold;
- source should not go negative unless Admin override is allowed;
- transfers after term close require reopening or correction flow.

Each transfer should appear in both account statements.
