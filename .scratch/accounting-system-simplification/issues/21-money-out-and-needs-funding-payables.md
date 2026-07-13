# 21 — Money-Out And Needs-Funding Payables

**What to build:** Salary, service, payable, and expense spending posts to term accounts while presenting shortages as Deficit, Needs Funding, or Outstanding Payables.

**Blocked by:** 18 — Term-Aware Accounts And Statements; 20 — Account Transfers And Deficit Funding

**Status:** ready-for-agent

- [ ] Money-out records post to the current open term ledger by default.
- [ ] Paying a salary/service/payable updates the affected account statement and balance.
- [ ] Partial or unfunded payables surface as Needs Funding or Outstanding Payables.
- [ ] Existing settlement-backed owing remains the detailed payable source while the UI uses simpler accounting language.
- [ ] Cancellations/corrections update the account view and preserve audit history.
- [ ] Tests cover funded payment, partially funded payment, needs-funding display, settlement-backed owing compatibility, cancellation, and correction behavior.
