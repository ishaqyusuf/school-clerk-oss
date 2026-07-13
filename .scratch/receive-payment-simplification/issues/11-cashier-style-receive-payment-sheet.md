# 11 — Cashier-Style Receive Payment Sheet

**What to build:** The default Receive Student Payment sheet becomes a guided cashier workflow: select or confirm student, choose payment type, choose description/item, confirm amount, method/date/reference, submit, then show receipt actions.

**Blocked by:** 09 — Receive Payment Options Read Model; 10 — Simplified Payment Submit Adapter

**Status:** done

- [x] Opening the sheet from a student context preselects that student.
- [x] Opening the sheet generally lets the operator search/select a student first.
- [x] Payment type selection uses the options read model and prioritizes outstanding/current items.
- [x] Description/item selection loads the configured price or outstanding amount defaults.
- [x] Changing student resets payment type, description, amount, and outstanding context.
- [x] Changing payment type resets description and amount.
- [x] Payment date and method default sensibly while reference/notes remain optional.
- [x] Submission uses the simplified adapter and shows print/download receipt actions after success.
- [x] UI tests cover the happy path from student selection through successful receipt action.

**Implementation note:** The exported receive-payment sheet now defaults to the simplified cashier workflow. The previous allocation-heavy sheet remains in the file as `LegacyReceivePaymentSheet` for the later advanced-controls ticket.
