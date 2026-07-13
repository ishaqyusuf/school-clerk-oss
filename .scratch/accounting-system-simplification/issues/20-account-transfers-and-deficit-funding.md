# 20 — Account Transfers And Deficit Funding

**What to build:** Operators can transfer funds between accounts to fund deficits or planned spending, with statement entries on both sides and permission controls.

**Blocked by:** 18 — Term-Aware Accounts And Statements

**Status:** ready-for-agent

- [ ] A user can transfer money from one account to another within the active term ledger.
- [ ] Transfers require amount, source account, destination account, and note/reason.
- [ ] Source account decreases and destination account increases.
- [ ] Each transfer appears in both account statements.
- [ ] Transfers that exceed threshold or require override enforce Admin permission.
- [ ] Transfers after term close are blocked unless the approved correction/reopen path is active.
- [ ] Tests cover normal transfer, insufficient funds behavior, large transfer gating, both-sided statement entries, audit logs, and closed-term restrictions.
