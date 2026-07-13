# 17 — Term Ledger Foundation

**What to build:** Establish Term Ledger as the operator-facing financial record for an academic term, with lifecycle basics and a minimal current-term overview.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Each academic term can be represented as a Term Ledger.
- [x] Term Ledger statuses support the approved lifecycle: Draft, Open, Closing, Closed, and Reopened.
- [x] The current active term can load a minimal ledger overview.
- [x] Closed terms remain readable and stable.
- [x] Admin/Accountant access follows current finance-read permission expectations.
- [x] Tests cover ledger creation/lookup, status transitions allowed in this slice, tenant boundaries, and current-term overview loading.

**Implementation note:** `finance.getTermLedger` provides the derived current-term ledger overview. Persistent lifecycle state, term-close snapshots, and stable closed-term reads remain for the close/carry-forward slice.
