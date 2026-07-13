# 14 — Advanced Legacy Payment Controls

**What to build:** Existing power-user receive-payment capabilities move behind an Advanced area so complex payments remain possible without cluttering the default cashier workflow.

**Blocked by:** 11 — Cashier-Style Receive Payment Sheet

**Status:** done

- [x] Advanced mode exposes multi-line outstanding allocation where required.
- [x] Advanced mode supports historical term payment workflows.
- [x] Advanced mode preserves manual allocation/correction paths that current operators still need.
- [x] Existing legacy outstanding charges and unapplied balances remain payable.
- [x] Default mode stays compact and does not show advanced tables or manual rows unless requested.
- [x] Regression tests confirm legacy multi-line, historical, and manual allocation paths still work.

**Implementation note:** `ReceivePaymentSheet` now defaults to the simplified cashier flow and exposes the previous allocation-heavy component through an Advanced switch with a Simple mode return action.
