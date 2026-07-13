# 22 — Term Close And Carry Forward

**What to build:** Admins can preview and close a term, snapshot account balances, run reconciliation checks, and create per-account carry-forward opening entries for the next term.

**Blocked by:** 19 — Collected-In Vs Paid-For Term Attribution; 20 — Account Transfers And Deficit Funding; 21 — Money-Out And Needs-Funding Payables

**Status:** done

- [x] Admins can preview term close before confirming.
- [x] Close preview reports account balances, surplus/deficit, pending payables, unresolved transfers, and reconciliation warnings.
- [x] Closing snapshots each account balance and keeps the old term readable.
- [x] Carry-forward is created per account, not only as one school-wide net amount.
- [x] The next term receives opening balances from carry-forward.
- [x] Closed terms block normal new transactions.
- [x] Tests cover close preview, blockers/warnings, snapshots, per-account carry-forward, next-term opening balances, closed-term read-only behavior, and Admin-only enforcement.

**Implementation note:** Added `FinanceTermLedgerClose` and `FinanceTermCarryForward`, plus `finance.previewTermClose`, `finance.closeTermLedger`, and `finance.reopenTermLedger`. Focused tests cover close snapshots, per-account carry-forward, opening ledger entries, and closed-term payment blocking; broader Admin-only and warning/blocker coverage remains.
