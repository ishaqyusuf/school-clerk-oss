Type: grilling
Status: done
Blocked by:

## Question

What operator-facing language and scope should define the simplified accounting system?

Resolve:
- the best name for the term's financial record: term account, term ledger, account statement, term statement, or another term;
- whether user-facing **Account** should replace visible **Stream** language;
- whether accounts are best explained as pockets, sources, funds, departments, or ledgers;
- the names for money-in streams, money-out streams, transfers, deficits, surplus, term close, and carry-forward;
- the difference between **collected in term** and **paid for term**;
- whether this system is intended to be a school cash-management ledger or a full double-entry accounting/general-ledger system;
- what should stay in the existing receive-payment simplification map rather than this broader accounting map.

The answer should produce a small glossary and a scope boundary that future tickets must use.

## Approved direction

Use **Term Ledger** for the full financial record of a term, and **Account** for the user-facing money pocket. Keep `Stream` as the internal technical word only.

Glossary:

- **Term Ledger**: all money activity for one academic term.
- **Account**: a pocket/source/use of money, like School Fees, PTA, Books, Salary, or Operations.
- **Account Statement**: transaction list for one account.
- **Collected in term**: when money was actually received.
- **Paid for term**: the academic term the payment belongs to.
- **Term Close**: the action that finalizes a term.
- **Carry Forward**: surplus or deficit moved into the next term.

Scope should be a practical school cash-management ledger, not a full external accounting package.
