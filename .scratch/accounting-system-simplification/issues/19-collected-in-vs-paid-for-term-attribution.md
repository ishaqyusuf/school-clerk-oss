# 19 — Collected-In Vs Paid-For Term Attribution

**What to build:** Payments distinguish the term where cash is collected from the academic term the payment is for, including receipts and arrears visibility.

**Blocked by:** 17 — Term Ledger Foundation; 18 — Term-Aware Accounts And Statements

**Status:** done

- [x] Student payments can record both collected-in term and paid-for term.
- [x] A payment collected in the current term for a previous term affects the current term cash/account ledger.
- [x] The previous-term obligation is reduced or annotated through allocation without adding new cash directly to a closed term.
- [x] Receipts show payment date, collected-in term, paid-for term, account affected, and amount paid.
- [x] Previous-term arrears are visible from the current bursary workspace.
- [x] Tests cover same-term payment, late payment for previous term, closed-term protection, receipt display data, and arrears updates.

**Implementation note:** `FinancePayment` and `FinanceLedgerEntry` now store collected-in session/term ids, while `FinanceCharge` remains the paid-for obligation. Term statements and ledgers prefer collected-in fields and fall back to charge term fields for older rows. Receipt display and closed-term protection remain for the receipt/term-close slices.
