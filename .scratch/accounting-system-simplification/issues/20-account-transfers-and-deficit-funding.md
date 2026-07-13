# 20 — Account Transfers And Deficit Funding

**What to build:** Operators can transfer funds between accounts to fund deficits or planned spending, with statement entries on both sides and permission controls.

**Blocked by:** 18 — Term-Aware Accounts And Statements

**Status:** done

- [x] A user can transfer money from one account to another within the active term ledger.
- [x] Transfers require amount, source account, destination account, and note/reason.
- [x] Source account decreases and destination account increases.
- [x] Each transfer appears in both account statements.
- [x] Transfers that exceed threshold or require override enforce Admin permission.
- [x] Transfers after term close are blocked unless the approved correction/reopen path is active.
- [x] Tests cover normal transfer, insufficient funds behavior, large transfer gating, both-sided statement entries, audit logs, and closed-term restrictions.

**Implementation note:** `finance.transferFunds` now requires finance-write access, a note/reason, Admin approval above `NGN 250,000`, and enough source balance for non-Admin users. Persistent closed-term blocking remains for the term-close slice.
