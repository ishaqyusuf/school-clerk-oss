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

## Enrollment Link Contracts

- Route: `enrollmentLinks.listLinks`
- Request schema: none
- Response schema: active tenant enrollment links with classroom counts, class age/notes fields, document requirement counts, website visibility, application counts, capacity fields, status, copyable public code, and tenant-correct public URL.
- Error cases: missing tenant context, unauthorized role.
- Notes: Admin/Registrar only.

- Route: `enrollmentLinks.createOrUpdateLink`
- Request schema: `{ id?, title, status?, showOnWebsite?, capacityMode, totalCapacity?, instructions?, opensAt?, closesAt?, classrooms[], documentRequirements[] }`, where `classrooms[]` may include `minimumAgeMonths`, `maximumAgeMonths`, `ageCutoffDate`, and `requirementNotes`, and `documentRequirements[]` may include optional `classRoomDepartmentId` plus `documentType`.
- Response schema: saved link with public code and nested classroom/document configuration.
- Error cases: no classrooms, invalid classroom tenant/session, invalid capacity, unauthorized role.
- Notes: classroom IDs are `ClassRoomDepartment.id` values from the active tenant. Requirement class targets must be one of the link's selected classroom IDs. Supported document types are `GENERAL`, `PASSPORT_PHOTO`, `BIRTH_CERTIFICATE`, `PREVIOUS_SCHOOL_REPORT`, and `OTHER`.

- Route: `enrollmentLinks.getApplications`
- Request schema: `{ linkId?: string | null, status?: EnrollmentApplicationStatus | null }`
- Response schema: pending application rows with selected classroom, student details, primary parent, typed submitted document metadata, document completion, status, accepted student/term links, admission payment metadata, admission-letter template metadata/URL, and approval-email sent timestamp.
- Error cases: missing tenant context, unauthorized role.

- Route: `enrollmentLinks.approveApplication`
- Request schema: `{ applicationId: string, admissionLetterTemplateId?: string | null, paymentRequired?: boolean, paymentLabel?: string | null, paymentAmount?: string | number | null, paymentCurrency?: string, paymentInstructions?: string | null, paymentLink?: string | null, paymentDueAt?: string | Date | null }`
- Response schema: `{ success: true, studentId, termFormId, appliedChargeCount }`
- Error cases: application not found, invalid tenant, invalid selected classroom, capacity reached, age requirement failed, missing applicable required documents, already approved/rejected, unknown or not-ready admission-letter template.
- Notes: approval creates or links guardian/parent, creates student/session/term forms, applies fee histories, stores payment handoff metadata and selected admission-letter template metadata, records accepted ids, sends the successful-admission email with the selected admission-letter PDF link, and records `admissionApprovalEmailSentAt` after email delivery. Built-in template IDs and ready custom admission-letter template IDs owned by the school are allowed. When `paymentRequired=true`, approval requires a positive amount plus either payment instructions or a payment link.

- Route: `enrollmentLinks.rejectApplication`
- Request schema: `{ applicationId: string, reason?: string | null }`
- Response schema: `{ success: true }`
- Error cases: application not found, already approved, unauthorized role.

- Public route: `school-site /enroll/[code]`
- Request schema: public code in URL plus submitted student, selected classroom, primary parent name/email/phone, applicable class/global typed document metadata/uploads, and notes.
- Response schema: pending application success state plus parent onboarding/login hint.
- Error cases: invalid/inactive/expired/full link, invalid classroom option, failed class age requirement, missing required fields, invalid parent email/phone, future DOB, missing applicable required uploads, upload for non-applicable class requirement, unsupported file type, non-image passport photo, upload too large, missing or invalid Vercel Blob store token.
- Notes: successful public submissions send a parent confirmation email through Resend when email is configured. Admission uploads are stored with unguessable Vercel Blob keys and are exposed only through authenticated admin/registrar review payloads in the current implementation.

- Public route: `school-site /api/pdf/admission-letter`
- Request schema: `{ code: string, applicationId: string, templateId?: string, download?: "true" }`
- Response schema: PDF stream for an approved admission application.
- Error cases: invalid query, application not found, application not approved, enrollment link code mismatch, invalid custom template JSON, PDF render failure.
- Notes: the route renders from approved `EnrollmentApplication` payload data and requires both the link code and application ID from the approval email. It falls back to the approved application's stored `admissionLetterTemplateId` when no query override is provided, supports built-in registry templates and ready custom JSON admission-letter templates, and includes the passport photo when a submitted document has `documentType=PASSPORT_PHOTO`.

## Document Template Contracts

- Route/action: `dashboard /settings/document-templates`
- Request schema: result-template save uses `{ templateId: string }`; custom-template request create uses `{ documentType, title, notes?, file }`; custom-template status update uses `{ requestId, status, quotedAmount?, quotedCurrency?, quotePaymentInstructions?, quotePaymentLink?, quotePaymentDueAt?, builtTemplateId?, builtTemplateVersion?, builtTemplateJson?, operatorNotes? }`.
- Response schema: server actions revalidate the settings page after successful writes.
- Error cases: missing tenant context, missing or invalid Blob token/store for uploads, unsupported file type, oversized file, invalid status, invalid quote amount, invalid payment link, quoted paid build missing payment instructions/link, selected template not owned/ready, ready custom template missing valid JSON, JSON template ID/type mismatch.
- Notes: result-template preferences can point at shared registry templates or ready custom result templates. Ready custom admission-letter templates are exposed in the enrollment approval/open/download selectors and rendered by the public admission-letter PDF route. Custom-template quotes use dashboard-visible payment instructions plus optional external links rather than native gateway checkout.

- Public website data resolver: `getPublicWebsiteData`
- Request schema: resolved public tenant profile plus optional published/template website configuration.
- Response schema: `WebsiteTemplateContentData` with config-backed collections and `admissionLinks[]`, where each admission link includes title, relative `/enroll/[code]` href, open classroom count/labels, date window, and instructions.
- Error cases: unresolved tenant or missing published config are handled by the calling public website route; manual-only, paused, archived, expired, not-yet-open, full, or deleted links are omitted.
- Notes: direct `/enroll/[code]` access is still governed by the enrollment form runtime; website admission sections are only discovery surfaces for eligible `showOnWebsite=true` links.

## Parent Portal Contracts

- Route: `parents.overview`
- Request schema: none
- Response schema: `{ wards[] }`, where each ward includes student identity, latest enrollment/application status, active classroom/term, outstanding finance summary, collection statuses for books/uniforms, and recent issuances where available.
- Error cases: missing tenant context, non-parent role, parent user not linked to any guardian.
- Notes: ward access is authorized through `Guardians.userId`.

## Search Contracts

- Route: `search.global`
- Request schema: `{ query: string, limit?: number }` where `query` is trimmed and capped at 100 characters, and `limit` is 1-20.
- Response schema: `Array<{ id: string, type: "student" | "classroom" | "staff", group: "Students" | "Classrooms" | "Staff", title: string, subtitle: string | null, href: string, rank: number }>`
- Error cases: missing tenant context returns an empty result set; queries shorter than 2 characters do not run remote record search.
- Notes: results are tenant-scoped by `schoolProfileId`; classroom results are current-session scoped when session context is available and link to `/academic/classes?viewClassroomId=<departmentId>&classroomTab=students`; student results link to `/students/<studentId>`.

## Assessment Contracts

- Route: `assessments.getRecordingContextOptions`
- Request schema: `{ termId?: string | null }`
- Response schema: `{ scoped: boolean, terms, classrooms, defaultTermId: string | null, defaultDepartmentId: string | null }`, where each term includes `id`, `title`, `sessionId`, `sessionTitle`, `label`, `startDate`, and `endDate`.
- Error cases: unauthenticated requests are rejected; missing tenant/session context returns empty scoped options for Teacher users; non-Teacher users receive unrestricted report terms and classrooms for the selected/default term.
- Notes: Teacher users are scoped to non-deleted `StaffTermProfile` terms and `StaffClassroomDepartmentTermProfiles` classrooms. The assessment recording page uses URL/cookie/date-derived defaults to auto-correct invalid teacher deep links; if the date-derived term has no teacher classrooms, the API falls back to the first assigned term with classrooms. If no date-current term can be inferred, the client asks the user to choose a current term and persists it through `switchSessionTerm`.

## Staff Management Contracts

- Route/action: `action.saveStaffAction`
- Request schema: `{ staffId?, email, role, assignments[] }`, where each assignment is `{ classRoomDepartmentId, subjectAccessMode, departmentSubjectIds[] }`.
- Response schema: `{ invited, inviteError, staffId }`.
- Error cases: missing tenant/session/term context, staff not found, invalid classroom, invalid selected subject, selected subject outside selected classroom, onboarding email failure surfaced as `inviteError`.
- Notes: `subjectAccessMode` is `SELECTED` or `ALL`. `SELECTED` requires one or more `departmentSubjectIds`; `ALL` accepts an empty subject list and grants every current and future active-term subject for the classroom. Classroom/subject assignment remains teacher-only; non-teaching roles persist empty assignment sets.

- Route: `staff.getFormData`
- Request schema: `{ staffId?: string }`
- Response schema: staff invite/edit options with `subjectsByClassroom` and staff `assignments[]` including `subjectAccessMode`.
- Error cases: missing active school/session/term context returns empty options.
- Notes: `ALL` assignments round-trip with empty `departmentSubjectIds` because effective subject access is resolved dynamically from the assigned classroom.

## School Signup And Owner Verification Contracts

- Route/action: `createSaasProfileAction`
- Request schema: `institutionName`, `institutionType`, `adminName`, `email`, `password`, optional school profile metadata, and `domainName` subdomain slug.
- Response schema: owner email, institution type label, `loginUrl`, `onboardingUrl`, `onboardingLoginUrl`, `siteUrl`, `workspaceUrl`, school name, and subdomain.
- Error cases: disabled institution type, reserved subdomain, unavailable subdomain, duplicate owner email, admin user creation failure.
- Notes: successful production signup provisions `{subdomain}.school-clerk.com` on the school-site Vercel project and `dashboard.{subdomain}.school-clerk.com` on the dashboard Vercel project. Signup also creates a 24-hour `email-verification:{token}` row in `Verification` and sends a Resend verification email.

- Public route: `dashboard tenant /verify-email?token=...`
- Request schema: verification token in query string.
- Response schema: public success/failure page.
- Error cases: missing token, expired token, invalid token, deleted/missing user.
- Notes: successful verification sets `User.emailVerified = true` and deletes the used `Verification` row.

## Student Contracts

- Route: `students.overview`
- Request schema: `{ studentId: string, termSheetId?: string | null }`
- Response schema: `{ id?: string, student: { id, name, surname, otherName, dob, gender, guardian, studentName }, studentTerms }`, where `guardian` is the first non-deleted linked guardian with `id`, `name`, `phone`, and `phone2`.
- Error cases: student not found for the active tenant; requested term sheet not found returns no active `id` while student overview data still loads.
- Notes: used by the student overview sheet/page and by the focused basic-info edit sheet. Student and term-sheet lookups are tenant-scoped by `schoolProfileId` and ignore soft-deleted rows.

- Route: `students.updateStudentBasicProfile`
- Request schema:
  ```ts
  {
    id: string;
    data: {
      name: string;
      surname: string;
      otherName?: string | null;
      gender: "Male" | "Female";
      dob?: Date | null;
      guardian?: {
        id?: string | null;
        name?: string | null;
        phone?: string | null;
        phone2?: string | null;
      } | null;
    };
  }
  ```
- Response schema: mutation success with no response body.
- Error cases: missing active tenant context, student not found in active tenant, guardian id not found in active tenant, invalid required student fields.
- Notes: updates student names, gender, and DOB. Parent details are normalized by trimming whitespace; blank or incomplete parent details clear the first existing guardian link, a supplied guardian id updates that tenant guardian, and complete parent details without an id upsert by name + phone + tenant before linking to the student.

- Route: `students.getImportNameGuide`
- Request schema: none
- Response schema: `{ names: string[] }`
- Error cases: missing tenant context
- Notes: returns a compact tenant-scoped unique list from non-deleted existing students' `name`, `surname`, and `otherName` fields. The dashboard import parser uses this guide for whitespace-only name splitting, including Arabic-aware normalization, before falling back to plain whitespace tokens.

- Route: `students.studentsRecentRecord`
- Request schema: none
- Response schema: `{ students, sessionTermId, schoolSessionId, classDepartments, term }`, where `students` contains non-deleted tenant students with basic identity, gender, current/recent classroom metadata, `termId`, `schoolSessionId`, term sheet id, term/session labels, and current-session form id when applicable.
- Error cases: missing tenant context
- Notes: used by student import review for classroom selection, existing-student search, and same-session/same-term match badges.

- Route: `students.verifyStudentImport`
- Request schema: optional fallback `classroomDepartmentId`, plus `rows` array of `{ lineNumber: number, originalText: string, name: string, surname: string, otherName?: string | null, gender?: string | null, classroomDepartmentId?: string | null }`
- Response schema: `{ results: Array<{ lineNumber, originalText, name, surname, otherName, inputGender, inferredGender, genderInferenceDetails: { confidence: number, sampleSize: number, source: string } | null, needsGender: boolean, status: 'readyToImport' | 'matchFound' | 'needsAttention', classRoom: string | null, classroomDepartmentId: string | null, fullMatch: MatchMeta | null, suspectedMatches: MatchMeta[] }> }` where MatchMeta is a student record metadata block containing name, classroom, term/session details, match confidence (0-100), and matching reason.
- Error cases: any supplied classroom department not found, unauthorized, or outside the active session.
- Notes: performs single-query batch validation for pasted student imports. Checks exact matches, flags edit-distance name typos (<= 2), infers missing gender with confidence >= 80% (min 2 samples), validates all supplied row-level classroom ids once, and avoids large child records to keep payloads compact. Rows without a row-level or fallback classroom are returned as `needsAttention`.

- Route: `students.verifyStudentImportBatch`
- Request schema: same as `students.verifyStudentImport`
- Response schema: same as `students.verifyStudentImport`
- Error cases: same as `students.verifyStudentImport`
- Notes: POST-backed mutation wrapper for the dashboard student-import modal. Use it for large pasted batches to avoid URL-length limits while preserving the same verification semantics as the query route.

- Route: `students.bulkDeleteTermSheets`
- Request schema: `ids[]` where each id is a `StudentTermForm.id`
- Response schema: `{ count: number }`
- Error cases: empty selection, invalid term form ids, missing tenant context
- Notes: soft-deletes multiple student term records in one request for classroom results batch removal, scoped to the active school tenant and limited to non-deleted rows

## Student Import Contracts

- Route: `students.executeStudentImport`
- Request schema:
  ```ts
  {
    classroomDepartmentId?: string | null;
    rows: {
      lineNumber: number;
      name: string;
      surname: string;
      otherName?: string | null;
      gender: "Male" | "Female";
      classroomDepartmentId?: string | null;
      action: "import_new" | "keep_match" | "update_match_with_name";
      existingStudentId?: string | null;
    }[];
  }
  ```
- Response schema:
  ```ts
  {
    createdStudents: number;
    keptMatches: number;
    updatedMatches: number;
    termSheetsCreated: number;
    skippedRows: number;
    failedRows: number;
    rows: {
      lineNumber: number;
      action: string;
      status: "created" | "kept" | "updated" | "skipped" | "failed";
      studentId?: string | null;
      termSheetCreated?: boolean;
      reason?: string;
    }[];
  }
  ```
- Error cases: missing active school/session/term context, supplied classroom not in active school or session, row without a valid classroom, existing student not in tenant, student has current term sheet in conflicting classroom
- Notes: batch mutation that creates students, keeps/updates matched students, and idempotently creates term sheets. Validates all supplied row-level classrooms against active school AND session ancestry. Detects cross-classroom current-term conflicts and reports them as row-level failures rather than creating duplicates. Applies fee histories to newly-created term sheets using the row target classroom. Per-row failures do not block successful rows.
- Dashboard cache invalidation on success:
  - Invalidates: `students.index`, `students.analytics`, `students.studentsRecentRecord`, `classrooms.all`
  - Report-sheet queries (`classroomReportSheet`, `getSubjectAssessmentRecordings`) require parameterized keys (classroom + term) not available in the import component context; these views refresh on navigation.
  - Finance query keys (fee histories, transaction streams, student balances) are parameterized per-student/per-classroom; fee histories applied during import are reflected on navigation.

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
- Notes: creates or updates the staff record, syncs tenant user role, persists teacher-only assignments, creates a staff-scoped onboarding reset token, and queues the shared staff invitation email through the Trigger `send-staff-invitation-email` job when required. In development, email CTA links prefer LAN-IP path-style dashboard URLs such as `http://<network-ip>:2200/<tenant>/reset-password` so links opened from another device can reach the tenant workspace.

- Route: `action.resendStaffOnboardingAction`
- Request schema: `staffId`
- Response schema: `{ invited: true }` after email delivery, or `{ invited: false, inviteError, inviteLink }` in development when local email configuration prevents delivery and a manual onboarding link is generated instead
- Error cases: missing tenant context, no staff email, onboarding already completed, invite delivery failure
- Notes: creates a fresh staff-scoped onboarding reset token, queues the shared staff invitation email through the Trigger `send-staff-invitation-email` job, resets invite state to pending, and records resend timestamp. In development, email CTA links prefer LAN-IP path-style dashboard URLs such as `http://<network-ip>:2200/<tenant>/reset-password` so links opened from another device can reach the tenant workspace. Production invite queueing failures remain errors; the manual-link fallback is development-only for missing `DEV_EMAIL_RECIPIENT`, missing `RESEND_API_KEY`, or Resend sender-domain verification failures.

- Route: `action.copyStaffOnboardingLinkAction`
- Request schema: `staffId`
- Response schema: `{ inviteLink }`
- Error cases: missing tenant context, no staff email, onboarding already completed, invalid staff role, link generation failure
- Notes: creates a fresh reset-password verification token and returns a staff-scoped onboarding URL with the canonical `token` query parameter, without sending email or revoking other active reset tokens.

- Route: `action.completeStaffOnboardingAction`
- Request schema: `staffId`, `email`, `name`, optional `title`, optional `phone`, optional `phone2`, optional `address`
- Response schema: `{ staffId, completed: true }`
- Error cases: onboarding link no longer matches a staff record
- Notes: used after password reset in the onboarding link flow to complete the staff profile and mark onboarding active

## AI Chat Contracts

- Route: `POST /api/chat`
- Request schema: `{ conversationId, input }` where `input` is either `{ kind: "text", text }` or `{ kind: "workflow", action }`
- Response schema: AI SDK UI message stream response, plus response headers `x-school-clerk-conversation-id`, `x-school-clerk-run-id`, `x-school-clerk-provider`, and `x-school-clerk-model`
- Error cases: unauthorized tenant/user, assistant disabled, role not allowed, conversation not found, invalid workflow payload
- Notes: persists the incoming user message, creates an `AssistantRun`, enforces role/capability checks, and records tool execution telemetry

- Route: `GET /api/chat/conversations`
- Request schema: none
- Response schema: `{ conversations[], capabilities[], config }`
- Error cases: unauthorized tenant/user
- Notes: returns tenant-user scoped conversation summaries, but the FAB treats the first/latest active conversation as the single canonical chat and does not expose conversation switching

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
