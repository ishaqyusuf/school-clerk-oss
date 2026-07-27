# Finance Payment API

## Previous-Term Student Payments

### `finance.getReceivePaymentOptions`

- Input: `{ studentId, termId?, sessionId?, paidForStudentTermFormId? }`.
- Requires finance read access and an authenticated tenant.
- The student query tenant-scopes both the student and nested term forms.
- Returns all valid student term forms newest-first as `termOptions[]`, with full `Session · Term` labels and selected-term outstanding totals.
- Returns separate paid-for and collected-in context. The selected student term owns the obligation; the active dashboard term/session owns the cash entry.
- Payment types and descriptions are scoped to the selected term's session, classroom, configured fees, and existing charges.
- Description metadata includes `studentTermFormId` and `termLabel`; payment-type metadata includes `termLabel`. These are presentation fields and do not rename stored streams, items, or charges.
- An existing selected-term charge suppresses its matching configured item, including when the charge is paid. Outstanding historical charges remain selectable when their finance item is inactive.
- Invalid cross-student or cross-tenant term forms return `NOT_FOUND`.

### `finance.receiveStudentPaymentSimple`

- `studentTermFormId` identifies the term that owns the charge.
- `termId` and `sessionId` identify the current collected-in accounting period.
- Existing historical charges are reduced while the payment and ledger entry post to the active term/session.
- A configured or custom fee without a charge creates the charge against the selected historical student term form before payment is recorded.
- Closed historical ledgers still allow settlement of existing charges. Creating a missing historical charge returns the standard reopen-term `BAD_REQUEST`.
- Existing charge submissions are validated against the selected student and selected paid-for term.

## Permissions

- Finance read access: load student term and payment options.
- Finance write access: create charges and receive payments.
- Reopening a historical ledger remains an explicit Admin operation; payment submission does not bypass ledger lifecycle permissions.
