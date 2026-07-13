# 13 — School Fee Quick-Create Path

**What to build:** The simplified receive-payment sheet can route a newly typed payment type into School fee creation, reusing existing fee setup behavior for one-student, class, selected-class, or whole-school application rules.

**Blocked by:** 11 — Cashier-Style Receive Payment Sheet

**Status:** ready-for-agent

- [ ] Typing a missing payment type title lets permitted users choose School fee.
- [ ] School fee creation uses the existing fee setup rules for amount, class scope, term/session context, and application behavior.
- [ ] School fee creation is Admin-only by default unless permissions are explicitly expanded.
- [ ] Created school fees become collectable payment types when applicable to the selected student.
- [ ] Applying a school fee to the current student or broader class/school scope updates outstanding balances correctly.
- [ ] Tests cover fee creation scope, permission denial, class applicability, duplicate handling, and payment after creation.
