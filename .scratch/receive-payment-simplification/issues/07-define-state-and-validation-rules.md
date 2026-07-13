Type: research
Status: done
Blocked by: 03, 04, 05, 06

## Question

What validation, defaulting, and state reset rules should the simplified sheet use?

Resolve:
- required fields for each path;
- default amount behavior when an existing description/item is selected;
- amount limits for outstanding charges versus new/manual charges;
- how payment method, date, and reference default and persist;
- what resets when student/payment type/description changes;
- duplicate prevention;
- error messages and recovery states.

The answer should define the state machine before implementation begins.

## Approved direction

Required fields for payment submission:
- student;
- payment type;
- description/item;
- amount paid greater than zero;
- payment method;
- payment date.

Additional required fields by path:
- new simple collection payment type: title;
- new school fee: title, amount, and application scope;
- new reusable description/item: title/description and amount;
- one-off manual collection: description and amount.

Defaulting rules:
- payment date defaults to today;
- payment method defaults to the school/user's default or last used method where available;
- reference is optional;
- existing outstanding charge defaults amount paid to amount due;
- configured item without an existing charge defaults amount paid to configured price;
- new typed description requires the operator to enter or confirm amount.

Amount rules:
- amount must be greater than zero;
- outstanding-charge payments should not exceed amount due unless overpayment/correction behavior is explicitly enabled;
- simple collection/manual payments may use any positive amount allowed by server policy;
- school-fee amount and scope should follow the existing fee form validation.

Reset rules:
- changing student resets payment type, description, amount, and outstanding context;
- changing payment type resets description and amount;
- changing description/item reloads default amount;
- switching between Simple collection and School fee resets fields that are specific to the previous mode;
- successful submission resets the form for the next payment unless the user chooses to stay on the same student.

Duplicate prevention:
- normalize titles before checking duplicates;
- prevent creating the same payment type under the same school/category context;
- prevent creating the same description/item under the same payment type, term, and class scope;
- when a likely duplicate exists, suggest selecting the existing option instead of creating another.

Error states should be recoverable and operator-friendly:
- explain missing required fields inline;
- keep entered values after server validation errors;
- show permission-denied messages for restricted creation actions;
- if creation succeeds but payment fails, keep the created option selected and let the operator retry payment.
