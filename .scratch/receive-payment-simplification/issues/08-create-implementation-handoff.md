Type: task
Status: done
Blocked by: 01, 02, 03, 04, 05, 06, 07

## Question

Create the final implementation handoff for the simplified Receive Student Payment flow.

This ticket should synthesize all resolved decisions into:
- scoped code-change plan;
- file-by-file implementation sequence;
- test plan;
- Brain documentation update checklist;
- migration/no-migration decision;
- rollout and compatibility notes.

Do not implement the code in this ticket unless the user explicitly moves from Wayfinder planning into implementation.

## Approved direction

Final handoff should treat this as a simplification over the existing finance model, not a database redesign. No database migration is expected unless implementation proves the current finance records cannot represent the approved behavior.

Recommended implementation sequence:

1. Add a receive-payment options read model.
2. Add a simple submit wrapper/adapter.
3. Refactor the receive payment sheet into the guided cashier flow.
4. Add quick-create payment type flow.
5. Add quick-create description/item flow.
6. Move old complex controls into Advanced.
7. Add role-gated UI states and server validation.
8. Add tests and update Brain documentation.

Likely code surfaces:
- `apps/api/src/trpc/routers/finance.routes.ts` for the new read/submit contracts;
- `apps/api/src/db/queries/finance.ts` for option sourcing and finance persistence helpers;
- `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx` for the simplified operator UI;
- `apps/dashboard/src/components/finance/forms/add-fee-sheet.tsx` for reusing school-fee configuration behavior;
- `apps/dashboard/src/components/students/student-transaction-overview.tsx` for cache invalidation/entry-point compatibility;
- existing finance item/payment tests or new focused tests around the simplified contracts.

Test plan:
- payment type options include configured fees, simple collections, and outstanding student items;
- inactive/previous items are hidden unless the selected student has an outstanding balance;
- quick-created simple collection appears in future payment type lists;
- quick-created school fee follows existing fee form scope rules;
- selecting an existing item loads the expected default amount;
- partial payment submits correctly;
- duplicate payment type/item creation is blocked or matched;
- permission gates block restricted creation actions;
- Advanced mode still supports legacy multi-line/manual behavior.

Brain documentation checklist:
- update `.brain/features/student-fees.md` for the simplified receive-payment behavior;
- update `.brain/api/contracts.md` for any new finance read/submit contracts;
- update `.brain/api/permissions.md` for payment collection and quick-create gates;
- update database docs only if schema or persistence behavior changes;
- add an ADR only if the implementation introduces a durable architecture decision beyond the approved presentation/wrapper model.

Rollout/compatibility notes:
- keep existing receive-payment backend behavior compatible;
- keep legacy controls available behind Advanced during rollout;
- do not remove existing receipt, ledger, or allocation behavior;
- prefer feature-flagging or staged release if operator feedback is needed before replacing the old default UI completely.
