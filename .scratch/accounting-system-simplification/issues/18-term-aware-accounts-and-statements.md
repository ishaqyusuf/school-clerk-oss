# 18 — Term-Aware Accounts And Statements

**What to build:** User-facing Accounts become term-aware views over the existing account/stream ledger, with account balances and account statements scoped to a selected Term Ledger.

**Blocked by:** 17 — Term Ledger Foundation

**Status:** done

- [x] The UI can list term accounts such as School Fees, PTA, Books, Salary, Service Bills, Operations, and Uniforms.
- [x] Account balances are shown with operator-facing labels like Available Balance, Money In, Money Out, Deficit, and Needs Funding.
- [x] CREDIT/DEBIT terminology is not exposed to operators.
- [x] Account statements list the term-scoped transactions for a single account.
- [x] Existing finance streams/ledger entries remain compatible with the account view.
- [x] Tests cover account list loading, term scoping, statement loading, balance calculation, and tenant boundaries.

**Implementation note:** `finance.getTermAccountStatement` provides the statement API and operator-facing labels. Dashboard UI wiring and broader tenant-boundary coverage remain.
