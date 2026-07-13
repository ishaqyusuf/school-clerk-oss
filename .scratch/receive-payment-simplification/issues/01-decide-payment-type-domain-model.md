Type: research
Status: done
Blocked by:

## Question

What should "payment type" mean in the simplified Receive Student Payment flow?

Resolve whether the first selector should represent:
- `FinanceStream` / account, such as Tuition, Books, PTA, Levy;
- `FinanceItem.type`, such as tuition/book/service/other;
- an active `FinanceItem` grouped by stream/name;
- or a presentation model combining streams and active collectable finance items.

The answer must explain how school-configured items, built-in/common labels, add-new behavior, student balances, and receipt/ledger writes map to the existing finance model.

## Approved direction

Define **Payment Type** as a simplified operator-facing category backed by the existing finance configuration, not as a new database concept.

- `FinanceStream` remains the accounting/receiving destination.
- `FinanceItem` remains the configured payable item or description under a stream.
- The Payment Type selector should be a presentation model built from active, collectable school-configured finance items and their streams.
- The Description selector should list previous/configured finance items under the selected payment type.
- Built-in/common labels such as Tuition, Books, PTA, and Levy should be quick-create suggestions, not forced default options.

The Payment Type selector should also support quick-create. When the operator types a title that does not exist, the UI should show a create option such as `Create "Graduation Fee"`. After choosing it, the flow should ask how the new payment type should work:

1. **Simple collection**: creates a reusable cashier-style payment category that appears in future payment type lists, but does not automatically apply charges to other students.
2. **School fee**: uses the existing fee setup behavior so the fee can be applied to one student, a class, selected classes, or the whole school.

The UI should use operator-friendly labels like **Simple collection** and **School fee** rather than exposing internal terms such as stream or finance item type.
