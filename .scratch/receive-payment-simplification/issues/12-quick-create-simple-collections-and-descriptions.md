# 12 — Quick-Create Simple Collections And Descriptions

**What to build:** Operators with permission can create reusable Simple collection payment types and reusable descriptions/items from the simplified receive-payment sheet without leaving the flow.

**Blocked by:** 11 — Cashier-Style Receive Payment Sheet

**Status:** done

- [x] Typing a missing payment type title shows a create option.
- [x] Choosing Simple collection creates or reuses a cashier-style payment category that appears in future payment type lists.
- [x] Simple collection creation does not automatically apply charges to students.
- [x] Typing a missing description under an existing payment type can create a reusable description/item with amount.
- [x] Duplicate payment types and duplicate descriptions are blocked or matched to existing options.
- [x] Users without creation permission see collection-only behavior and clear permission messaging.
- [x] Tests cover simple collection creation, description creation, duplicate prevention, future option visibility, and permission gating.

**Implementation note:** Admin-capable quick-create saves a collectable `FinanceItem` before submitting payment; non-privileged finance operators still submit a one-off charge through `finance.receiveStudentPaymentSimple`.
