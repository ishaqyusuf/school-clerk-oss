Type: grilling
Status: done
Blocked by: 05, 06, 07

## Question

What exactly happens when a term is closed and balances are carried forward?

Resolve:
- what checks must pass before closing a term;
- whether all account balances are zeroed in the closed term or only the next term starts from a carry-forward summary;
- how surplus and deficit should move to the next term;
- whether carry-forward is one school-wide net amount or one amount per account/pocket;
- whether previous term account statements remain readable after close;
- how late payments after close affect the previous term's statement and the new term's cash balance;
- how reopening or correcting a closed term works.

The answer should define the term close algorithm in operator language before API/schema planning begins.

## Approved direction

Do not erase the old term's history. Instead, close it with final balances and create opening balances in the next term.

Close should:

- run reconciliation checks;
- snapshot each account balance;
- summarize surplus/deficit per account;
- create carry-forward opening entries for the next term;
- keep the old term readable.

Carry-forward should happen per account, not only as one school-wide net amount. Late payments after close should be collected in the current term while still marked as paid for the previous term.
