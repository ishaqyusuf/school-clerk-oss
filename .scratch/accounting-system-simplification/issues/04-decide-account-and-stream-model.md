Type: grilling
Status: open
Blocked by: 01, 02, 03

## Question

What exactly is an account or stream in the simplified system?

Resolve:
- whether a user-facing Account maps directly to `FinanceStream`;
- whether accounts are term-specific records, school-wide definitions, or a combination of reusable definitions plus per-term balances;
- how income accounts such as School Fees, PTA, Books, and Levies differ from outgoing accounts such as Salary, Service Bills, and Operations;
- whether an account can go negative;
- whether account type should remain CREDIT/DEBIT or become clearer operator-facing categories;
- how account balances should be calculated and displayed;
- whether closing/carry-forward needs explicit account balance snapshots.

The answer should make it unambiguous how accounts, streams, pockets, and balances relate to current or future database records.

## Approved direction

User-facing **Account** maps to an internal `FinanceStream`, but balances should be term-aware.

Examples:

- School Fees Account
- PTA Account
- Books Account
- Salary Account
- Service Bills Account
- Operations Account

Do not show CREDIT/DEBIT to users. Use labels like **Money In**, **Money Out**, **Transfer**, **Deficit**, and **Available Balance**.

Accounts can go negative when allowed, but the UI should call that a **Deficit** or **Needs Funding**, not just a negative balance.
