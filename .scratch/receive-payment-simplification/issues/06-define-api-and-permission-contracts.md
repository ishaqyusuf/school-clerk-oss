Type: research
Status: done
Blocked by: 01, 02, 04, 05

## Question

What API contracts and role gates are needed for the simplified receive-payment flow?

Resolve:
- read endpoint shape for payment type options and description/item suggestions;
- mutation payload for the simplified submit;
- whether existing `finance.receiveStudentPayment`, `finance.upsertItem`, and `finance.getStudentPurchaseSuggestions` are sufficient;
- permission matrix for collecting payment versus creating new reusable payment types/items;
- audit/activity-log expectations;
- server-side validation for tenant, term, classroom applicability, stream ownership, and amount safety.

The answer should be directly translatable into API/contract documentation.

## Approved direction

Create a focused receive-payment read model instead of making the simplified UI compose many finance endpoints.

Recommended read endpoint:

`finance.getReceivePaymentOptions({ studentId })`

It should return:
- selected student summary;
- current session, term, and classroom context;
- available payment types;
- whether each payment type is a simple collection or school fee;
- stream/category identifiers needed by the server;
- description/item suggestions under each payment type;
- existing outstanding charge references;
- default amount/due amount;
- quick-create permission flags;
- validation hints for class/session applicability.

Recommended submit endpoint:

`finance.receiveStudentPaymentSimple(...)`

This can be a wrapper over the existing `finance.receiveStudentPayment` service. The UI should submit simple intent, and the server should translate it into the existing allocation/charge/payment model.

Suggested submit input:
- `studentId`;
- selected or newly-created payment type;
- selected or newly-created description/item;
- payment mode: existing item, simple collection, or school fee;
- amount paid;
- payment method;
- payment date;
- optional reference/notes;
- optional fee application scope when creating a school fee.

Existing endpoints such as `finance.receiveStudentPayment`, `finance.upsertItem`, and `finance.getStudentPurchaseSuggestions` can still be used internally, but the simplified sheet should not need to orchestrate them directly.

Permission matrix:
- receive payment: Admin, Accountant;
- create simple collection payment type: Admin by default, Accountant only if explicitly allowed;
- create school fee: Admin by default;
- create reusable description/item: Admin by default, Accountant only if explicitly allowed;
- create one-off/manual student charge: Admin and Accountant where existing finance permissions allow;
- read payment options: authenticated finance-capable users.

Server-side validation must enforce:
- tenant ownership;
- selected student belongs to the active tenant/school;
- term/session validity;
- classroom applicability;
- stream/item ownership;
- amount greater than zero;
- overpayment rules;
- duplicate reusable payment type/item prevention.

Audit/activity logging should record both the payment and any reusable finance configuration created from the receive-payment sheet.
