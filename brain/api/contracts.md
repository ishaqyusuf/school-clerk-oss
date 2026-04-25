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

## Student Contracts
- Route: `students.bulkDeleteTermSheets`
- Request schema: `ids[]` where each id is a `StudentTermForm.id`
- Response schema: `{ count: number }`
- Error cases: empty selection, invalid term form ids, missing tenant context
- Notes: soft-deletes multiple student term records in one request for classroom results batch removal, scoped to the active school tenant and limited to non-deleted rows

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
- Response schema: `{ id, name, type, createdAt, periodLabel, totalIn, totalOut, balance, pendingBills, pendingBillsCount, owingAmount, activeBillables, activeBillablesCount, projectedBalance, transactions[], records[] }` where `records[]` combines cash transactions, stream bills, and active billables
- Error cases: stream not found for current tenant, missing tenant context
- Notes: used by `/finance/streams/[streamId]` to open a stream from the finance accounting grid into a statement-style detail page with both cashflow and payable visibility

- Route: `finance.payStaffBill` / `finance.payServiceBill`
- Request schema: `billId`, `amount`, optional `date`
- Response schema: `{ success: true, amount, fundedAmount, owingAmount, status, paymentId }`
- Error cases: bill not found, payment already active, missing tenant context
- Notes: payment now uses available stream funds first and records uncovered balance in `BillSettlement` instead of failing all-or-nothing

- Route: `finance.repayBillOwing`
- Request schema: `billId`, `amount`, optional `date`
- Response schema: `{ success: true, billId, repaidAmount, outstandingOwing, title }`
- Error cases: payable has no outstanding owing, no available stream funds, bill not found for tenant
- Notes: reduces outstanding owing after later stream funding without reopening the original payable, and records each repayment as a settlement repayment entry linked to a wallet transaction

- Route family: `finance.*`
- Auth schema: authenticated tenant session required; finance read/write access is role-gated server-side for `Admin` and `Accountant`
- Notes: this now applies consistently to streams, bills, billables, payroll, service payments, student payment receipt/reversal, and collections routes

- Route: `finance.getFinanceIntegrityReport`
- Request schema: optional `termId`
- Response schema: `{ totals, checks[], mismatches }`
- Error cases: missing tenant context, unauthorized finance read access
- Notes: powers the reconciliation workspace with integrity checks for stream/payable/collections consistency

- Route: `finance.getFinanceReports`
- Request schema: optional `termId`
- Response schema: `{ summary, streams[], payroll[], servicePayments[], collections[], owingLedger[] }`
- Error cases: missing tenant context, unauthorized finance read access
- Notes: canonical reporting snapshot used for reconciliation exports and operator reporting

- Route: `finance.generateBillsFromBillables`
- Request schema: optional `termId`, optional `billableIds[]`
- Response schema: `{ success: true, created[], skipped[] }`
- Error cases: invalid tenant context, unauthorized finance write access
- Notes: generates payable bills from active service billables while preventing duplicates per current billable history

- Route: `finance.backfillBillSettlements`
- Request schema: optional `termId`
- Response schema: `{ success: true, hydrated: number }`
- Error cases: invalid tenant context, unauthorized finance write access
- Notes: hydrates older invoice-backed payable rows into the settlement model used by current stream funding

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

## Staff Contracts
- Route: `staff.getStaffList`
- Request schema: optional `q`, optional `status` in `all | pending | active | failed`
- Response schema: `{ items[], stats }` where each item includes role, onboarding status, invite timestamps, classroom count, subject count, and resend eligibility
- Error cases: missing tenant school/session/term context
- Notes: onboarding status is resolved from invite fields plus available auth credentials so existing staff can appear active even before explicit backfill

- Route: `staff.getFormData`
- Request schema: optional `staffId`
- Response schema: `{ roles[], classrooms[], subjectsByClassroom, staff }`
- Error cases: staff not found for current tenant, missing tenant context
- Notes: `subjectsByClassroom` supports the invite-first assignment UI where admins choose one or more classrooms and then multiple subjects inside each classroom

- Route: `action.saveStaffAction`
- Request schema: `email`, `role`, `assignments[]` where each assignment is `{ classRoomDepartmentId, departmentSubjectIds[] }`
- Response schema: `{ invited, inviteError, staffId }`
- Error cases: invalid classroom/subject combinations, missing tenant context, invite delivery failure
- Notes: creates or updates the staff record, syncs tenant user role, persists teacher-only assignments, and automatically sends onboarding when required

- Route: `action.resendStaffOnboardingAction`
- Request schema: `staffId`
- Response schema: `{ invited: true }`
- Error cases: missing tenant context, no staff email, onboarding already completed, invite delivery failure
- Notes: resets invite state to pending and records resend timestamp

- Route: `action.completeStaffOnboardingAction`
- Request schema: `staffId`, `email`, `name`, optional `title`, optional `phone`, optional `phone2`, optional `address`
- Response schema: `{ staffId, completed: true }`
- Error cases: onboarding link no longer matches a staff record
- Notes: used after password reset in the onboarding link flow to complete the staff profile and mark onboarding active

## Assistant Contracts
- Route: `POST /api/chat`
- Request schema: `{ conversationId, input }` where `input` is either `{ kind: "text", text }` or `{ kind: "workflow", action }`
- Response schema: AI SDK UI message stream response, plus response headers `x-school-clerk-conversation-id`, `x-school-clerk-run-id`, `x-school-clerk-provider`, and `x-school-clerk-model`
- Error cases: unauthorized tenant/user, assistant disabled, role not allowed, conversation not found, invalid workflow payload
- Notes: persists the incoming user message, creates an `AssistantRun`, enforces role/capability checks, and records tool execution telemetry

- Route: `GET /api/chat/conversations`
- Request schema: none
- Response schema: `{ conversations[], capabilities[], config }`
- Error cases: unauthorized tenant/user
- Notes: returns tenant-user scoped history summary for the widget

- Route: `POST /api/chat/conversations/:conversationId/messages`
- Request schema: `{ role: "assistant" | "system", content, parts[] }`
- Response schema: `{ message }`
- Error cases: unauthorized tenant/user, conversation not found, invalid message part payload
- Notes: used by the client to persist the final assistant UI message after streaming completes

- Route: `POST /api/chat/settings`
- Request schema: assistant config payload including `enabled`, provider/model preferences, allowed roles, enabled/disabled capabilities, analytics/feedback flags, and `maxSteps`
- Response schema: `{ config }`
- Error cases: unauthorized tenant/user, non-admin access, invalid config payload
- Notes: assistant settings are tenant-scoped and currently admin-managed

- Route: `GET /api/chat/analytics`
- Request schema: none
- Response schema: `{ analytics }` including conversation count, run count, failed runs, top tool usage, average rating, recent runs, and unresolved demand samples
- Error cases: unauthorized tenant/user, analytics disabled
- Notes: analytics are currently user-scoped within the tenant widget experience
