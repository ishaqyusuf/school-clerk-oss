Type: prototype
Status: open
Blocked by: 01, 02

## Question

What is the simplest collector-facing happy path for receiving a student payment?

Design the flow at wireframe/detail level without implementing production code. Cover:
- student selection entry point;
- payment type selection;
- description/item selection or free typing;
- default price loading;
- amount paid entry;
- payment method/date/reference defaults and where advanced metadata lives;
- submit state;
- receipt actions after success.

The answer must state which current controls disappear from the default view and which remain behind advanced disclosure.

## Approved direction

The simplified sheet should feel like a cashier workflow instead of a finance workstation.

Default flow:

1. Select/search student, unless the sheet was opened from a student profile.
2. Select or quick-create **Payment Type**.
3. If creating a payment type, choose **Simple collection** or **School fee**.
4. Select or type **Description**.
5. Load/default the configured price.
6. Enter **Amount Paid**.
7. Confirm payment method, payment date, and optional reference.
8. Submit.
9. Show receipt actions after success.

Default metadata behavior:
- payment date defaults to today;
- payment method defaults to the school/user's normal default or last used method where available;
- reference is optional;
- notes, historical term selection, and extra metadata live under a collapsed **More details** or **Advanced** section.

Controls hidden from the default view:
- term accordion;
- full payable table;
- select-all pending action;
- manual stream allocation rows;
- purchase suggestion panel;
- multi-line allocation controls.

Controls retained behind **Advanced**:
- term breakdowns;
- historical items;
- multi-line outstanding allocation;
- manual allocation/correction paths;
- complex unapplied legacy balances.
