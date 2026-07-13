# 11 — Cashier-Style Receive Payment Sheet

**What to build:** The default Receive Student Payment sheet becomes a guided cashier workflow: select or confirm student, choose payment type, choose description/item, confirm amount, method/date/reference, submit, then show receipt actions.

**Blocked by:** 09 — Receive Payment Options Read Model; 10 — Simplified Payment Submit Adapter

**Status:** ready-for-agent

- [ ] Opening the sheet from a student context preselects that student.
- [ ] Opening the sheet generally lets the operator search/select a student first.
- [ ] Payment type selection uses the options read model and prioritizes outstanding/current items.
- [ ] Description/item selection loads the configured price or outstanding amount defaults.
- [ ] Changing student resets payment type, description, amount, and outstanding context.
- [ ] Changing payment type resets description and amount.
- [ ] Payment date and method default sensibly while reference/notes remain optional.
- [ ] Submission uses the simplified adapter and shows print/download receipt actions after success.
- [ ] UI tests cover the happy path from student selection through successful receipt action.
