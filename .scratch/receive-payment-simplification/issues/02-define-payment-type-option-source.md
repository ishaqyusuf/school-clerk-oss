Type: research
Status: open
Blocked by: 01

## Question

Which records should appear in the Payment Type selector, and in what order?

Resolve the source query and filtering rules:
- only current school settings;
- active/current-term finance items;
- collectable items only or all student-payable items;
- class-scoped filtering based on the selected student's current classroom;
- whether tuition and other common constants appear only if configured or as suggestions;
- how duplicate stream/item names collapse into one option;
- whether previous-term or inactive items can be used as suggestions.

The answer should produce a deterministic list contract for the selector.

## Approved direction

Show payment types from the school's configured finance setup, plus quick-create suggestions.

The selector should include:
- active, collectable student-payable `FinanceItem` records;
- current-term items and reusable/global items;
- items applicable to the selected student's current classroom;
- simple collection payment types that were previously created;
- existing outstanding items already charged to the selected student, even if they are no longer broadly active;
- a quick-create option when the typed title does not already exist.

Inactive, deleted, or previous-term records should not appear in the default list unless the selected student still has an outstanding balance against them. Previous records may be used as suggestions during create/match flows.

Duplicate options should collapse into one operator-facing payment type when they share the same normalized display title and stream/category. Their individual configured items should appear under the description/item selector instead of duplicating the payment type row.

Deterministic order:

1. Existing outstanding items for the selected student.
2. Current configured school fees.
3. Simple collection types previously created.
4. Recently used payment types.
5. Alphabetical fallback.
6. `Create new payment type`.
