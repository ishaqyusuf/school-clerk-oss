# 09 — Receive Payment Options Read Model

**What to build:** A receive-payment options contract that gives the dashboard everything needed to render the simplified cashier flow for a selected student: student context, current term/class, available payment types, description/item suggestions, outstanding items, default amounts, and permission flags.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Selecting a student returns active payment types from configured school finance settings, simple collections, and outstanding student items.
- [x] Options are filtered by tenant, current term/session, collectable status, and the student's class applicability.
- [x] Inactive or previous-term options are hidden unless the selected student has an outstanding balance against them.
- [x] Each option exposes enough metadata for the UI to show defaults without understanding low-level finance internals.
- [x] Permission flags indicate whether the current user can create simple collections, school fees, reusable descriptions/items, or one-off manual charges.
- [x] Contract tests cover configured fees, simple collections, outstanding items, class filtering, inactive item hiding, and duplicate collapse.

**Implementation note:** API read model and focused query tests are in place. The remaining checkbox is for broader duplicate-collapse/regression coverage after the UI consumes the contract.
