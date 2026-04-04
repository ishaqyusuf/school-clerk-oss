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
- Notes: `paymentIds` powers receipt printing/downloading immediately after payment capture, and successful student payment capture now also dispatches tenant-scoped in-app plus email notifications using a typed notification registry

- Route: `finance.getStreamDetails`
- Request schema: `streamId`
- Response schema: `{ id, name, type, createdAt, periodLabel, totalIn, totalOut, balance, transactions[] }` where each transaction includes `id`, `reference`, `partyName`, `studentClassroom`, `title`, `description`, `amount`, `type`, `direction`, `status`, and `transactionDate`
- Error cases: stream not found for current tenant, missing tenant context
- Notes: used by `/finance/streams/[streamId]` to open a stream from the finance accounting grid into a statement-style detail page

- Route: `finance.cancelServiceBillPayment`
- Request schema: `billId`
- Response schema: `{ success: true, amount: number, title: string | null, staffName: string | null }`
- Error cases: bill not found, no active/cancelled-compatible payment on the bill, missing tenant context
- Notes: cancels the linked wallet transaction without erasing bill history, so finance UIs can render a `Cancelled` state and still allow a later re-payment

- Route: `finance.cancelStaffBillPayment`
- Request schema: `billId`
- Response schema: `{ success: true, amount: number, title: string | null, staffName: string | null }`
- Error cases: bill not found, no active/cancelled-compatible payment on the bill, missing tenant context
- Notes: mirrors service-payment cancellation semantics for payroll and dispatches payroll cancellation notifications

- Route: `notifications.list`
- Request schema: `take`, `onlyUnread`
- Response schema: `Notification[]` scoped to the authenticated tenant user and ordered newest-first
- Error cases: missing tenant session context
- Notes: powers the bell popover and the full `/notifications` page

- Route: `notifications.unreadCount`
- Request schema: none
- Response schema: `number`
- Error cases: missing tenant session context
- Notes: badge source for header notification bell

- Route: `notifications.markRead`
- Request schema: `notificationId`
- Response schema: updated `Notification`
- Error cases: notification not found for the current tenant user, missing tenant session context
- Notes: ownership check is enforced before marking a notification as read

- Route: `notifications.markAllRead`
- Request schema: none
- Response schema: Prisma `updateMany` result
- Error cases: missing tenant session context
- Notes: bulk read action for bell and notifications page
