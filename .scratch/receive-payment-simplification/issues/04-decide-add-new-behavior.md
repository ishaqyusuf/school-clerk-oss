Type: grilling
Status: open
Blocked by: 01

## Question

What exactly happens when a collector clicks "Add new" from the payment type or description selectors?

Resolve separate behaviors for:
- adding a new payment type/stream/account, such as Books or PTA;
- adding a new description/item under an existing payment type, such as a specific book title;
- opening the existing fee form versus inline creation;
- required fields for quick creation;
- whether quick-created records are reusable school settings or one-off manual charges;
- role restrictions for creating reusable finance settings from the receive-payment sheet.

The answer should leave no ambiguity about whether quick creation writes `FinanceStream`, `FinanceItem`, `FinanceCharge`, or a combination.

## Approved direction

There should be two quick-create paths: payment type creation and description/item creation.

### Create payment type

When the typed payment type title does not exist, show a create option such as `Create "Graduation Fee"`. After the operator chooses it, ask how the payment type should work:

1. **Simple collection**
   - Creates a reusable cashier-style payment category.
   - Writes a reusable `FinanceStream`/payment category record, or reuses an existing matching stream if one exists.
   - Does not automatically apply charges to other students.
   - Does not create a `FinanceCharge` until an actual student payment is submitted.
   - Can create a `FinanceItem` later when the operator saves a reusable description/item under it.
   - Appears in future payment type lists for other students.

2. **School fee**
   - Uses the existing fee setup behavior.
   - Creates or reuses the required stream/category and writes the relevant configured fee item.
   - Can apply to one student, a class, selected classes, or the whole school.
   - Creates/applies student charges according to the same rules as the existing fee form.
   - Should route to or embed the existing fee-form rules when scope, class applicability, or fee application behavior is needed.

The UI should say **Simple collection** and **School fee**, not expose internal language like finance stream or finance item type.

### Create description/item

When a payment type already exists, the operator can create a description/item under it, such as a specific book title.

Creating a reusable description/item:
- writes a `FinanceItem` under the selected payment type/stream;
- requires at least title/description and amount;
- defaults to current session/term where relevant;
- should support class scope when used as a fee-style item;
- does not create a `FinanceCharge` until the item is applied or the payment is submitted.

A one-off payment that should not become reusable should create only the payment/charge records needed for that student through the existing manual charge path.

Permission recommendation:
- Admin can create reusable payment types and school fees.
- Accountant/operator can collect payments.
- Accountant/operator can create reusable simple collection items only if explicitly granted.
- One-off/manual student payment remains available to Admin and Accountant where current finance permissions allow it.
