Type: task
Status: open
Blocked by: 09, 10, 11

## Question

Create the final implementation handoff for the simplified term-based accounting system.

This ticket should synthesize all resolved decisions into:
- product model;
- operator glossary;
- scoped implementation phases;
- file-by-file code plan;
- API/schema migration plan;
- UI workflow plan;
- permissions and audit plan;
- test and QA matrix;
- Brain documentation checklist;
- rollout and compatibility notes.

Do not implement the code in this ticket unless the user explicitly moves from Wayfinder planning into implementation.

## Approved direction

Final handoff should be phased.

Suggested phases:

1. Lock glossary and product model.
2. Add/read term-ledger model and account read models.
3. Add payment/transfer term attribution.
4. Build account/term overview screens.
5. Build transfer and deficit funding workflow.
6. Build term-close/carry-forward workflow.
7. Integrate receive-payment simplification.
8. Add reconciliation, reports, permissions, audit logs.
9. Add tests and Brain docs.

No implementation should start until the term ledger lifecycle, account model, money-in/out rules, and carry-forward behavior are approved.
