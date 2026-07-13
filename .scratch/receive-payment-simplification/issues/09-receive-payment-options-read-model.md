# 09 — Receive Payment Options Read Model

**What to build:** A receive-payment options contract that gives the dashboard everything needed to render the simplified cashier flow for a selected student: student context, current term/class, available payment types, description/item suggestions, outstanding items, default amounts, and permission flags.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Selecting a student returns active payment types from configured school finance settings, simple collections, and outstanding student items.
- [ ] Options are filtered by tenant, current term/session, collectable status, and the student's class applicability.
- [ ] Inactive or previous-term options are hidden unless the selected student has an outstanding balance against them.
- [ ] Each option exposes enough metadata for the UI to show defaults without understanding low-level finance internals.
- [ ] Permission flags indicate whether the current user can create simple collections, school fees, reusable descriptions/items, or one-off manual charges.
- [ ] Contract tests cover configured fees, simple collections, outstanding items, class filtering, inactive item hiding, and duplicate collapse.
