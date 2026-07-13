# 27 — Accounting Reports, Reconciliation, And Permissions

**What to build:** Add the reporting, reconciliation, audit, and permission layer needed to trust the simplified accounting system before rollout.

**Blocked by:** 22 — Term Close And Carry Forward; 25 — Product/Project Account Profit Tracking; 26 — Staff, Vendor, And Payee History Surfaces

**Status:** ready-for-agent

- [ ] Reports/exports cover term ledgers, accounts, purchases, payroll, payables, arrears, product/project accounts, and reconciliation.
- [ ] Pre-close checks include missing ledger terms, negative accounts, pending payables, unresolved transfers, cancelled rows with active ledger effects, and unmatched carry-forward.
- [ ] Audit logs record payments, transfers, close runs, carry-forward entries, reopen actions, corrections, payroll/wage actions, and purchase/payee actions.
- [ ] Admin/Accountant gates are enforced for view, receive, pay, transfer, close, reopen, override, and correction actions.
- [ ] Reports use operator-facing accounting language rather than internal stream terminology.
- [ ] Tests cover report data, export availability, reconciliation checks, audit logs, and permission boundaries.
