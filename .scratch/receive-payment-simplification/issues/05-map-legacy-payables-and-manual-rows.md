Type: research
Status: open
Blocked by: 01, 03

## Question

How should the simplified flow preserve existing receive-payment capabilities without keeping the bulky UI?

Resolve how to handle:
- existing outstanding charges and unapplied fee histories;
- partial payments;
- overpayments or payments without a configured charge;
- selecting multiple outstanding lines;
- old manual stream row behavior;
- current term versus historical term payment;
- payment against a configured item not yet applied to the student.

The answer should decide what belongs in the default simplified path, what belongs in an advanced mode, and what can be deferred or removed.

## Approved direction

Keep the existing capabilities, but move them out of the main operator path.

Default simplified path should support:
- selecting one payment type;
- selecting or typing one description/item;
- paying an existing outstanding item;
- partial payment;
- paying a configured item that has not yet been charged to the student;
- creating a simple one-off collection when permitted.

Advanced mode should preserve:
- multiple outstanding lines;
- historical term payments;
- old manual stream row behavior;
- overpayments and unusual corrections;
- unapplied `FeeHistory`/legacy balances;
- payment against old or inactive items where the student still has a balance.

Behavior rules:
- if the selected payment type/item matches an existing outstanding charge, apply payment to that charge first;
- if there is no existing charge but the item is configured, create/apply the needed student charge before recording payment;
- if the payment is a simple collection, create only the student-specific charge/payment records needed for the transaction unless the operator explicitly saves a reusable description/item;
- do not remove old backend capabilities while simplifying the default UI.

Deferred/removable from the default screen:
- bulk selection;
- always-visible term tables;
- always-visible stream allocation rows;
- purchase suggestion panels.
