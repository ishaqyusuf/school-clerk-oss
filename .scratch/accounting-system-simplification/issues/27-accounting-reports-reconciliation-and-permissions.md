# 27 — Accounting Reports, Reconciliation, And Permissions

**What to build:** Add the reporting, reconciliation, audit, and permission layer needed to trust the simplified accounting system before rollout.

**Blocked by:** 22 — Term Close And Carry Forward; 25 — Product/Project Account Profit Tracking; 26 — Staff, Vendor, And Payee History Surfaces

**Status:** done

- [x] Reports/exports cover term ledgers, accounts, purchases, payroll, payables, arrears, product/project accounts, and reconciliation.
- [x] Pre-close checks include missing ledger terms, negative accounts, pending payables, unresolved transfers, cancelled rows with active ledger effects, and unmatched carry-forward.
- [x] Audit logs record payments, transfers, close runs, carry-forward entries, reopen actions, corrections, payroll/wage actions, and purchase/payee actions.
- [x] Admin/Accountant gates are enforced for view, receive, pay, transfer, close, reopen, override, and correction actions.
- [x] Reports use operator-facing accounting language rather than internal stream terminology.
- [x] Tests cover report data, export availability, reconciliation checks, audit logs, and permission boundaries.

Note: the implemented audit surface is a report projection over canonical finance records and actor fields, not a separate immutable audit-event table. ADR-0006 captures this tradeoff and follow-up option.
