# API Contracts

## Purpose
Defines request/response contracts, validation rules, and versioning expectations.

## How To Use
- Update when payload shape or status behavior changes.
- Record breaking vs non-breaking changes.
- Keep examples short and representative.

## Template
## Contract Rules
- Every route validates input schema.
- Responses include consistent error envelope.
- Tenant context is required for tenant-scoped routes.

## Endpoint Contract Template
- Route:
- Request schema:
- Response schema:
- Error cases:
- Notes:

## Finance Contracts
- Route: `transactions.createSchoolFee`
- Request schema: `title`, `amount`, optional `description`, optional `feeId`, optional `streamId`/`streamName`, `classroomDepartmentIds[]`
- Response schema: mutation success with current-term `FeeHistory` created or updated in place
- Error cases: invalid term, missing tenant context, invalid stream/classroom references
- Notes: editing an existing current-term fee now updates the active `FeeHistory` row instead of always creating a new version

- Route: `transactions.deleteSchoolFeeCurrentTerm`
- Request schema: `feeHistoryId`
- Response schema: `{ success: true, title: string }`
- Error cases: fee history not found for current tenant/term
- Notes: soft-deletes only the current-term `FeeHistory`; older term records remain intact

- Route: `finance.receiveStudentPayment`
- Request schema: `studentId`, `studentTermFormId`, `paymentMethod`, optional `paymentDate`, optional `reference`, `amountReceived`, `allocations[]`
- Response schema: `{ success: true, count: number, totalAllocated: number, paymentIds: string[] }`
- Error cases: allocation total mismatch, overpayment against pending amount, fee history outside the student's classroom scope
- Notes: `paymentIds` powers receipt printing/downloading immediately after payment capture

- Route: `finance.getStreamDetails`
- Request schema: `streamId`
- Response schema: `{ id, name, type, createdAt, periodLabel, totalIn, totalOut, balance, transactions[] }` where each transaction includes `id`, `reference`, `partyName`, `studentClassroom`, `title`, `description`, `amount`, `type`, `direction`, `status`, and `transactionDate`
- Error cases: stream not found for current tenant, missing tenant context
- Notes: used by `/finance/streams/[streamId]` to open a stream from the finance accounting grid into a statement-style detail page
