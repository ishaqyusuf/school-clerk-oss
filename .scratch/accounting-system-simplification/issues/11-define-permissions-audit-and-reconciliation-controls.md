Type: research
Status: done
Blocked by: 05, 06, 07, 08, 13, 14, 15, 16

## Question

What permissions, audit controls, and reconciliation checks are required?

Resolve:
- who can view term ledgers, receive money, pay money, transfer funds, close terms, reopen terms, and post corrections;
- which actions require Admin approval rather than Accountant access;
- how activity logs should describe payment attribution, transfers, close runs, and carry-forward entries;
- what reconciliation checks must run before term close;
- what warnings should block close versus merely warn the bursary team;
- how cancellation/reversal after close should be audited.

The answer should align with current Admin/Accountant finance route enforcement and large-action approval thresholds.

## Approved direction

Permission recommendation:

- View ledger/accounts: Admin, Accountant.
- Receive money: Admin, Accountant.
- Pay money: Admin, Accountant.
- Transfer funds: Accountant under threshold, Admin for large/override transfers.
- Close term: Admin only.
- Reopen term/corrections after close: Admin only.

Audit logs should record payments, transfers, close runs, carry-forward entries, reopen actions, and corrections.

Pre-close checks should include:

- missing ledger terms;
- negative accounts;
- pending payables;
- unresolved transfers;
- cancelled rows with active ledger effects;
- unmatched carry-forward.
