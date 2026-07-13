# 10 — Simplified Payment Submit Adapter

**What to build:** A simplified payment submission path that accepts the cashier form intent and maps it to existing finance charge, payment, allocation, receipt, activity-log, and ledger behavior.

**Blocked by:** 09 — Receive Payment Options Read Model

**Status:** ready-for-agent

- [ ] The submit path accepts student, payment type, description/item, amount paid, method, date, optional reference, and optional notes.
- [ ] Paying an existing outstanding item allocates against the correct charge and updates the student balance.
- [ ] Paying a configured item without an existing charge creates or applies the required charge before recording payment.
- [ ] Simple collection payments create only the transaction records needed unless the operator explicitly saved reusable settings.
- [ ] Successful submission returns receipt identifiers/actions compatible with existing receipt behavior.
- [ ] Server validation enforces tenant ownership, student ownership, term/session validity, classroom applicability, stream/item ownership, duplicate safety, positive amount, and overpayment policy.
- [ ] Tests cover existing charge payment, configured item without charge, simple collection, partial payment, one-off manual collection, validation errors, and permission failures.
