# Database Relationships

## Import canonical/enrollment/fee ancestry — 2026-09-22

No schema/FK change. Import creates new canonical students and then explicit directly linked session/term forms in one transaction. Matched identities are locked; current-term references are discovered by direct ID or parent student ID. One active owned session parent is required, and inconsistent/duplicate references reject. Valid null direct term IDs can reuse their proven parent without backfill. Shared fee preparation validates attached charge ancestry, while retained/unbound selected-student/term charges prevent creating or adopting another enrollment. Existing unchanged admission preserves fees; changes reconcile protected history. No archive revival, class move, identity repair or live data operation. ADR-0061; behavioral verification deferred.

## Import job/row receipt boundary — 2026-09-22

No schema/FK change. Lock StudentImportJob before its exact StudentImportJobRow, reload persisted scope/payload, and commit domain writes plus terminal studentId/termSheetCreated/reason/completedAt outcome together. Fresh locked recovery preserves already committed receipts, and aggregate snapshots share the job lock. Legacy RUNNING rows retain any existing student/term evidence but fail for manual review without replay or data repair. Terminal jobs never resume via aggregation. This protects one persisted row with new workers only; drain old worker versions before rollout. ADR-0060; no live data operation or behavioral verification.

## Profile correction and guardian links — 2026-09-08

No schema/FK changes. Profile/gender updates lock one owned canonical student. Changed gender discovers active terms through both direct/parent links, validates ancestry, preserves closed academic/ledger charges and prepares open forms through the shared fee integrity/locking helper. Fees/profile/contact/link changes commit together. No parent/term identity repair or historical demographic snapshot is introduced. Guardian edits require one consistent active link, preserve archived contacts and all logins, avoid shared-contact rewrite, and soft-remove only the selected student relationship. Existing contact reuse never reactivates archived records. ADR-0058; no live data operations or verification.

## Admission classification and fee ownership — 2026-09-08

No FK/schema change. Selected StudentTermForms must agree with owned active canonical student/parent/session/term/classroom ancestry, without silent direct-student-ID repair. Classification and all selected fee reconciliation share one Serializable transaction. Active FinanceCharge references must agree with student/form/session/term and owned stream/item/original class; exact selected student/term charges lacking a form link require review rather than adoption. Cancellation is restricted to unallocated, ledger-unlinked, zero-paid DRAFT/PENDING automatic/selected charges with repeated ownership predicates. Other financial and parent/class/history relationships remain untouched. ADR-0057; no live operation or verification.

## Class-change term/session placement — 2026-09-08

No FK/schema changes. A new move updates selected owned StudentTermForm.classroomDepartmentId and the corresponding owned StudentSessionForm default within one Serializable transaction, preserving every other term form's direct placement. Validate the unique active student/session parent and scalar parent-linked children, including archived links, before shared-default updates. Matching no-op forms do not independently overwrite a default altered by a later term move. No canonical ID repair, new enrollment, fee repricing or assessment/attendance relation reassignment. Original class-bound history remains linked to its original structures; later projections may require separate review. See ADR-0055; no live mutation or behavioral verification ran.

## Guarded term-detail projection — 2026-09-08

No FK/schema change or data repair. The preview validates StudentTermForm → StudentSessionForm/Students and SchoolSession/SessionTerm/ClassRoomDepartment ancestry before owned student content. Assessment/attendance projections require matching class/term and same-school subject or attendance parents. FinanceCharge matches the owned student/form/session/term and stream; FinancePaymentAllocation follows those charges to owned student payments/streams and exposes only allocated amount, not an entire cross-term receipt. Active-reference count mismatches withhold that section, without exposing mismatched IDs. Restricted domains perform no reads; archived rows are outside the bounded preview. See ADR-0054; all behavioral verification deferred.

## Selected term-form archive — 2026-09-08

No FK/schema change. The shared term-removal service validates canonical student, session form, academic term and school session ownership/ID agreement for every requested row before archiving. Canonical students are locked in sorted order and selected active StudentTermForm rows are soft-deleted atomically with exact counts; previously archived valid rows are counted separately. Parent StudentSessionForm, Students, other terms and financial/assessment/attendance/guardian records are retained. No ID backfill or balance cancellation; closed active terms reject the batch. See ADR-0052; no live action or verification ran.

## Atomic student archive — 2026-09-08

No FK/schema change. `softDeleteStudent` locks the exact school-owned Students row, resolves active StudentSessionForm references and StudentTermForm references directly or through owned session forms, and rejects contradictory/null-school ownership before writes. Canonical and selected owned academic rows receive one deletedAt timestamp in a Serializable transaction with affected-count checks. No student-ID backfill, hard delete, restoration or implicit cleanup of already-archived partial state. Guardians, assessment/attendance and financial relations remain stored without cancellation. Repeat completed archives return already-deleted. See ADR-0051; no live operation or verification ran.

## Registration linkage — 2026-09-08

No FK/schema change. The new registration path writes canonical student IDs directly into StudentSessionForm and StudentTermForm, with identical school/session/classroom ancestry after validating every selected term. It creates no academic rows for canonical-only registration. Guardian reuse requires the same-school live identity; archived collisions are read explicitly and rejected, without restoring or modifying the contact shared by other wards. These writes and initial-term fees/payments share one Serializable API transaction. Existing malformed/legacy rows are not repaired; global uniqueness and other writers remain outside this slice. See ADR-0049; no live database action or testing performed.

## Legacy staff-login matching guard — 2026-09-07

No FK/schema change: StaffProfile remains email-linked to User. New DB-owned identity helpers resolve one active previous-email user within the account; incoming-email collisions are checked globally, and ambiguous/shared identities are not automatically reassigned. Serializable staff saves include identity, credential/session and assignment changes. Email changes clear legacy StaffProfile/User and credential Account passwords before requiring new setup. Status updates match original staff/school/account/email and preserve completed rows. This does not establish global database email uniqueness or cover every legacy writer; see ADR-0030. No runtime operations/tests ran.

## Atomic staff onboarding — 2026-09-07

Application-level Verification proof binds StaffProfile, User, school and account plus current email/role; no FK/schema changes. Exactly one active credential Account must belong to that User. Completion consumes proof/setup capability and updates that account password, matching pending staff profile, exact user name/email verification and stored sessions in one serializable transaction. No bulk email-based identity update remains in the completion action. This does not resolve staff-save email collision/reassignment semantics or validate every cached-session consumer. See ADR-0029; no runtime writes/tests ran.

## Notification feed ownership — 2026-09-07

API delivery now uses a separate DB-owned live context: the selected school belongs to an active non-purging account; initiating Session/User and recipient User belong to that account; current preference matches school/user/type. In-app creation reuses existing NotificationContact and NotificationRecipient relations inside the same transaction as context/policy checks. No FK/schema change or runtime operation. Existing globally unique user-contact collisions are not reassigned across schools; a failed contact create rolls back this channel. Email reads current context twice but its provider call is outside a DB transaction.

No schema/FK changes. `Notification.schoolProfileId` and allowed type are combined with either an active `NotificationRecipient` whose active contact matches user/school, or legacy `Notification.userId` when no such recipient exists. Existing user contacts are looked up without creation. Recipient status takes precedence; null is unread. DB-owned transactional read/all-read writes retain the same parent/recipient scope, preserving hidden rows and their status. Client cache and send-time coverage remain pending; no runtime data operations or tests ran.

## Conversation access envelope — 2026-09-07

`AssistantConversation.meta.historyAccess` governs access to its opaque prose and related `AssistantMessage`, `AssistantRun`, `AssistantToolExecution` and linked feedback projections. It conservatively records tools available to runs and requires the full set under current permissions. DB row locks serialize scope expansion/appends and permitted content queries; no FK/schema changes. Legacy records remain unchanged but unclassified. Independently scoped committed tool receipt reads remain available when that tool's current permission allows them. No live data writes/backfill/deletion or tests ran.

## Atomic AI mutation result linkage — 2026-09-07

Domain changes, deletion of the corresponding `Verification` approval, scoped `AssistantToolExecution` completion/output and the completion `Activity` now share one transaction in all five mutation tools. Activity metadata records the execution reference/output; output receipt version 1 distinguishes the new atomic contract from historical completed logs. Recovery queries follow `AssistantRun`/`AssistantConversation` owner and tenant relationships and current tool access. No schema/FK changes or data backfill; runtime proof remains deferred.

## AI mutation approval scope — 2026-09-07

`Verification` approval records use an application-enforced namespace/school/user/conversation binding and a signed-token digest, not new foreign keys. DB helpers resolve the matching `AssistantRun` and active owned `AssistantConversation` before issuing/consuming. Enrollment, payment, inventory creation/issuance and assessment writes consume approval in their own transaction, so rollback preserves both sides. Signed v2 payloads additionally bind academic session/term. No schema changes or data operations were run; post-commit audit/receipt recovery remains follow-up work.

## Enrollment Parent Identity Ownership

- `EnrollmentApplicationParent.linkedUserId` remains a scalar bridge. Public setup must prove recorded-email ownership and match the current application/school/account before setting it; approval must resolve it to a non-deleted, email-verified Parent with matching tenant/email.
- `Guardians.userId` is not inferred from application phone/name. Conditional linking preserves existing ownership and refuses an unlinked guardian with other active wards. Such collisions require staff resolution. Historical links are not automatically deleted or reassigned.
- One-use email capability consumption and account/parent/guardian writes occur in a serializable transaction. This changes write policy, not Prisma relationships. Verification is deferred; see [ADR-0024](../decisions/ADR-0024-enrollment-parent-email-proof.md).

## Tenant Module Configuration

- `SchoolProfile` 1:0..1 `SchoolModuleConfiguration`, enforced by the unique school foreign key. Hard deletion of a school cascades to its configuration; disabling a module does not delete any domain records.
- `updatedByUserId` is a scalar last-actor audit reference, not an authorization grant. Normal reads/writes scope through the active non-deleted school's account; explicit platform operations require platform authorization before calling DB helpers.
- The single revision covers both enabled-set edits and entitlement edits, preventing a stale school-admin save from racing a platform grant/revocation. A zero-row compare-and-swap update must be handled as a conflict/unavailable record by the API.

## Admission And Finance Applicability

- `Students` → `StudentTermForm` remains one-to-many; admission classification
  is owned by each term form.
- `FinanceItem` applies to a `StudentTermForm` through evaluated tenant,
  session, term, classroom, admission-audience, and canonical-student gender
  attributes.
- Materialized `FinanceCharge.studentTermFormId` preserves the exact billed
  term. Paid or partially paid charges survive later classification changes.

## Purpose

Describes entity relationships and cardinality constraints.

## How To Use

- Update when relations or ownership boundaries change.
- Keep tenant boundary notes explicit.
- Use concise relationship statements.

## Relationship Map

- `SaasAccount` 1:N `SchoolProfile`
- `SaasAccount` 1:N `User`
- `SaasAccount` 1:N `TenantDomain` (direct denormalized link — enables account-level domain queries without joining through SchoolProfile)
- `SchoolProfile` 1:N `TenantDomain`
- `SchoolProfile` 1:N `WebsiteTemplateConfig` (planned public website draft/archive/published-row history)
- `SchoolProfile` 1:1 `WebsitePublishedConfig` (planned pointer to active live website)
- `TenantDomain` stores `subdomain` (slug) + optional `customDomain` (full domain)
- `WebsitePublishedConfig` 1:1 `WebsiteTemplateConfig` (planned active published configuration)
- `SchoolProfile` 1:N `Students`, `StaffProfile`, `Guardians`, `ClassRoom`, `Activity`, `Fees`, `Billable`, `Wallet`
- `SchoolSession` 1:N `SessionTerm`, `ClassRoom`, `StudentSessionForm`, `StudentTermForm`
- `ClassRoom` 1:N `ClassRoomDepartment`
- `ClassRoomDepartment` 1:N `DepartmentSubject`, `StudentSessionForm`, `StudentTermForm`, `StudentAttendance`
- `StaffProfile` 1:N `StaffTermProfile`; `StaffTermProfile` 1:N `StaffClassroomDepartmentTermProfiles`; `StaffProfile` 1:N `StaffSubject`; `StaffTermProfile` 1:N `StaffAcademicAccessGrant`
- `StaffClassroomDepartmentTermProfiles` links a staff term profile to one classroom department and stores `subjectAccessMode = SELECTED | ALL`.
- `StaffSubject` links staff profiles to explicit `DepartmentSubject` rows when classroom access mode is `SELECTED`; `ALL` classroom assignments resolve subject access dynamically through the assigned classroom department.
- `StaffAcademicAccessGrant` stores durable hierarchy-aware teacher grants for class, department/arm, subject-across-class, and subject-in-department scopes without materializing every covered department subject.
- Effective teacher access is the union of active `StaffAcademicAccessGrant` rows plus legacy `StaffClassroomDepartmentTermProfiles` and `StaffSubject` rows for the same staff term profile.
- `Students` 1:N `StudentSessionForm`, `StudentTermForm`, `StudentFee`, `StudentAssessmentRecord`, `StudentWalletTransactions`
- `StudentImportJob` 1:N `StudentImportJobRow`; each job is tenant-scoped by `schoolProfileId` and captures `schoolSessionId`, `sessionTermId`, and optional `createdByUserId` as scalar ownership/audit fields.
- `Students` N:M `Guardians` via `StudentGuardians`
- `User` 1:N `Guardians` through nullable `Guardians.userId` for authenticated parent portal access
- `SchoolProfile` 1:N `EnrollmentLink`
- `SchoolProfile` 1:N `SchoolDocumentTemplatePreference`
- `SchoolProfile` 1:N `CustomDocumentTemplateRequest`
- `SchoolProfile` 1:N `AssessmentPublicLink`
- `SessionTerm` 1:N `AssessmentPublicLink`
- `ClassRoomDepartment` 1:N `AssessmentPublicLink`
- `EnrollmentLink` 1:N `EnrollmentLinkClassroom`, `EnrollmentLinkDocumentRequirement`, and `EnrollmentApplication`
- `EnrollmentLinkClassroom` N:1 `ClassRoomDepartment`; allowed classrooms are validated against the link tenant/session before submission or approval
- `EnrollmentLinkClassroom` owns per-link selected-class admission rules such as age range, age cutoff date, capacity, and requirement notes.
- `EnrollmentLinkDocumentRequirement` optionally N:1 `ClassRoomDepartment`; null class target means the document requirement applies to every classroom on that link.
- `EnrollmentLinkDocumentRequirement.documentType` classifies required uploads such as passport photos, birth certificates, previous reports, general documents, or other custom documents.
- `EnrollmentApplication` 1:N `EnrollmentApplicationParent` and `EnrollmentApplicationDocument`
- `EnrollmentApplication` stores approval payment handoff metadata and `admissionApprovalEmailSentAt` on the application decision record so parent-facing approval emails can be audited without creating a separate payment session yet.
- `EnrollmentApplication.admissionLetterTemplateId` and `admissionLetterTemplateVersion` record the PDF template selected during approval; the public admission-letter route rebuilds the PDF from application payload data and can resolve built-in registry templates or ready custom JSON templates.
- `EnrollmentApplicationDocument.documentType` copies the requirement kind at upload time so review, approval, and later admission-letter generation can locate passport/photo files without parsing labels.
- `EnrollmentApplication.acceptedStudentId` and `acceptedTermFormId` record the student/term records created or linked after approval
- `SchoolDocumentTemplatePreference` stores one active tenant default per document type through a partial unique index on `(schoolProfileId, documentType)` where `deletedAt IS NULL`.
- `CustomDocumentTemplateRequest` stores uploaded source files, quote payment handoff metadata, and custom-build quote/status metadata; when `status=READY`, `builtTemplateId` plus validated `builtTemplateJson` can be exposed in school template selectors and rendered by JSON PDF routes.
- `StudentTermForm` 1:N `StudentAttendance`, `StudentFee`, `StudentPayment`, `StudentAssessmentRecord`
- `SchoolProfile` N:1 active `SessionTerm` through `activeSessionTermId`; one term may be the active pointer for its owning school.
- `SchoolProfile` 1:N `AcademicTermSetupRun`.
- `AcademicTermSetupRun` N:1 source `SessionTerm` and N:1 target `SessionTerm`; source is nullable for an empty setup.
- `SessionTerm` 1:N `ClassRoomAttendance` for direct term attribution.
- `ClassRoomDepartment` 1:N `ClassRoomAttendance`; each attendance session belongs to one authorized classroom department.
- `DepartmentSubject` 1:N `ClassRoomAttendance`; the relation is nullable for general attendance and required by the application contract for subject attendance.
- `ClassRoomAttendance` 1:N `StudentAttendance`; active rows represent the current roster marks while corrected rows are soft-deleted for historical preservation.
- `ClassRoomAttendance` 1:N `AttendanceSessionRevision`; immutable snapshots record create, correction, and soft-delete actions.
- `AttendanceSessionGuard` stores scalar `attendanceId` ownership rather than a foreign key so guard deletion/release is explicit and legacy attendance rows require no backfill. Tenant/kind/key uniqueness serializes concurrent duplicate and idempotent requests.
- `StaffProfile` 1:N `StaffTermProfile`; permanent teacher identity is reused while term-specific assignment rows are created or matched during rollover.
- `StudentAssessmentRecord` 1:N `StudentAssessmentRecordHistory`; history keeps scalar student/term-form/assessment identity snapshots without foreign-key relations to those snapshot entities and uses `onDelete: SetNull` for the optional current-record relation.
- `Wallet` 1:N `WalletTransactions`; `WalletTransactions` links to `StudentPayment` and `BillPayment`
- `Wallet` 1:N `FeeHistory` (via `walletId` — accounting stream for student fees)
- `Wallet` 1:N `BillableHistory` (via `walletId` — accounting stream for staff/service billables)
- `Wallet` 1:N `Bills` (via `walletId` — pending and paid payables assigned to a stream)
- `FeeHistory` N:M `ClassRoomDepartment` via implicit join `_ClassRoomDepartmentToFeeHistory` (empty = all classes)
- `BillableHistory` N:M `ClassRoomDepartment` via implicit join `_BillableHistoryToClassRoomDepartment` (empty = all classes)
- `BillInvoice` 1:1 `BillPayment`; `Bills` may link to `BillInvoice`, `BillPayment`, `Billable`, `Wallet`
- `BillSettlement` 1:1 `Bills` and 1:1 `BillPayment` (canonical settlement state for a payable)
- `BillSettlement` 1:N `BillSettlementRepayment` (later funding applied against owing)
- `BillSettlementRepayment` 1:1 `WalletTransactions` (cash transaction used to cover prior owing)
- `BillPayment.amount` represents the issued payable amount, the linked `WalletTransactions.amount` represents the cash-funded portion, and `BillSettlement.owingAmount` now acts as the canonical outstanding owing balance.
- `FinancePayment` N:1 `SessionTerm` / `SchoolSession` through collected-in fields; this is separate from the paid-for term stored on `FinanceCharge`.
- `FinanceLedgerEntry` N:1 `SessionTerm` / `SchoolSession` through collected-in fields; term ledgers and account statements use these fields for cash/account attribution.
- `FinancePaymentAllocation` links a collected payment to the `FinanceCharge` it settles, preserving paid-for term attribution even when cash was collected in a later term.
- `FinanceTermLedgerClose` 1:N `FinanceTermCarryForward`; each close row snapshots one term ledger and each carry-forward row belongs to one finance stream/account.
- `FinanceTermCarryForward` may point to a next term/session by scalar ids and may store the opening `FinanceLedgerEntry.id` created for that next term.
- `FinancePayee` 1:N `FinanceCharge`, `FinancePayment`, and `FinancePurchase`; reusable vendor/casual-worker/service-provider records are identity/context records, while the charge/payment/ledger rows remain canonical accounting records.
- `StaffProfile` 1:N `FinancePayrollStructure`; each payroll structure can generate or guide `FinanceCharge` salary/wage obligations through `FinanceCharge.payrollStructureId`.
- `FinanceStream` 1:N `FinancePayrollStructure` and `FinancePurchase`; salary/wage and purchase/project activity is always attributed to a stream/account for term ledger and account statement reporting.
- `FinancePurchase` may link 1:1 to `FinanceCharge` and 1:1 to `FinancePayment`; unpaid purchases have a charge without a payment, while immediately paid purchases link both.
- `FinancePaymentImportJob` 1:N `FinancePaymentImportJobRow`; the job owns the
  global tenant/session/term context and each row owns its review decisions and
  execution result ids. Result ids intentionally remain scalar audit links so
  canonical finance record lifecycle does not cascade into import history.
- One imported job row creates one `FinancePayment`, allocation, and ledger
  entry. Multiple configured-item rows may allocate to the same
  `FinanceCharge`, which preserves partial receipt history while settling one
  student obligation.

## Integrity Rules

- Most domain entities must be tenant-scoped through `schoolProfileId` or session/school ancestry.
- Cross-tenant references should be prohibited at service/repository level.
- Staff classroom assignments must remain scoped by staff profile, school session, session term, and classroom tenant ancestry.
- Teacher subject authorization must accept either an explicit non-deleted `StaffSubject` row or a non-deleted `ALL` classroom assignment for the subject's classroom and term.
- Planned website publish invariant: a tenant can own many website configs, but exactly zero or one config may be live at a time through `WebsitePublishedConfig`.
- Planned website publish transaction: publishing must update config status, published timestamp, and published pointer atomically. Superseded live rows are archived rather than reverted to editable drafts.
- Planned website immutability invariant: once `WebsiteTemplateConfig.publishedAt` is set, content/theme/section/SEO edits are blocked; admins must duplicate the config into a new draft before changing it.
- Planned website ownership invariant: `WebsitePublishedConfig.websiteConfigId` must always reference a `WebsiteTemplateConfig` owned by the same `schoolProfileId`.
- Enrollment link invariant: public submissions must resolve the link by `code`, require `ACTIVE` status plus valid open/close dates, and only allow classrooms listed on `EnrollmentLinkClassroom`.
- Enrollment document invariant: public submission and approval must require only global document requirements plus requirements targeted to the selected `classRoomDepartmentId`.
- Enrollment age invariant: when `EnrollmentLinkClassroom` has age limits, public submission and approval must calculate age from `studentDob` against `ageCutoffDate`, then link opening date, then current date.
- Enrollment approval invariant: approval must re-check tenant, active session/term, classroom capacity, age rules, document requirements, and current student/guardian state before creating or linking canonical student records.
- Document template preference invariant: a saved tenant preference must resolve to either a built-in shared registry template or a ready custom template request owned by the same `schoolProfileId`.
- Custom template quote invariant: if a request is moved to `QUOTED` with a positive `quotedAmount`, the operator must provide either payment instructions or an external payment link.
- Custom template invariant: a request should only be marked `READY` when its `builtTemplateJson.documentType` matches the request `documentType` and its `builtTemplateJson.templateId` matches `builtTemplateId`.
- Assessment public link invariant: authenticated creation/request/approval must validate the link tenant, term, classroom, and captured subject filter before a token is issued.
- Assessment public token invariant: public result-entry routes resolve only by signed token plus stored hash, require `APPROVED` status, enforce `expiresAt`, and must not broaden beyond the stored classroom, term, subject IDs, or optional student-term-form IDs.
- Assessment public score invariant: public score writes may only target scoreable assessments within the link's captured department subject scope and classroom term sheets.
- Assessment score history invariant: every normal score create or update must append exactly one `StudentAssessmentRecordHistory` row inside the same transaction, including same-value saves and explicit clears.
- Academic setup invariant: `(schoolProfileId, idempotencyKey)` identifies one durable setup apply; completed retries return the stored result and apply never deletes target academic data.
- Active term invariant: explicit activation updates the target lifecycle and `SchoolProfile.activeSessionTermId` in one transaction while closing the previous active term.
- Closed term invariant: normal academic record mutations reject terms with `lifecycleStatus = CLOSED`.
- Legacy models (`school`, `guardian`, `session_class`) use separate relation chains and need consolidation rules.
- TODO: add DB-level indexes/constraints audit for tenant scoping fields.

## Term Sheet Creation & Reuse Rules

- A `StudentTermForm` is the canonical "current term sheet" for a student in a given session/term/classroom tuple.
- `Students` 1:N `StudentTermForm` per session; at most one non-deleted `StudentTermForm` per (student, sessionTerm, schoolSession) should exist.
- Import execution creates a `StudentTermForm` only when no non-deleted current-term form exists for the student+session+term. Multi-classroom import uses the row target `ClassRoomDepartment` for this lookup and for newly created forms.
- If a current-term form already exists in the same classroom department, it is reused without modification.
- If a current-term form already exists in a different classroom department, the import reports a row-level failure with the conflicting classroom name — no duplicate is created.
- Newly created term sheets trigger `applyFeeHistoriesToStudentTermForm` to auto-assign active `FinanceItem` charges for the row target classroom department.
- `StudentSessionForm` is created lazily (only if none exists for the student+session) before creating a `StudentTermForm`.
- Duplicate student detection is class/term scoped through active, non-deleted `StudentTermForm` rows and groups by normalized `Students.name + surname + otherName`.
- Duplicate student merge treats `Students` as the identity record and `StudentTermForm` as the class/term enrollment record. Safe merges move term-form-owned attendance, assessment, finance charge, and enrollment accepted-term references to the primary term form, move direct student references such as guardians, direct assessments, finance charges/payments, notification recipients, and enrollment accepted student ids to the survivor, then soft-delete duplicate term forms and duplicate student copies.
- Merge execution must block when multiple current-term duplicate copies have non-empty assessment, attendance, or finance records that require manual review, or when assessment records would collide with the `StudentAssessmentRecord` unique key after the move.
- Student creation, student import, class change, term migration, and batch promotion must reuse the exact duplicate guard before creating or moving a student into a class/term scope.
- Student import job retry invariant: a row with final `StudentImportJobRow.status` (`CREATED`, `KEPT`, `UPDATED`, `SKIPPED`, or `FAILED`) is not re-executed by the worker. Job aggregate counters are recomputed from persisted row statuses after processing so retries do not double-count completed rows.

# Assessment Workbook Relationships

- One `AssessmentWorkbookExport` has zero or many `AssessmentWorkbookImport` rows.
- `AssessmentWorkbookImport.exportId` references `AssessmentWorkbookExport.id` with delete restriction.
- Tenant, term, and classroom ids are captured as immutable scalar audit boundaries rather than cascading relations; the signed workbook and apply service verify the corresponding live tenant-scoped entities before use.
- `createdAssessmentIds` records standalone assessment rows created in the same transaction, while canonical score rows continue to relate through `StudentAssessmentRecord.classSubjectAssessmentId`.
# QA cleanup boundary

- QA classification belongs to `SaasAccount` and therefore covers its schools,
  users, domains, and school-owned aggregates.
- `QaPurgeRun` deliberately has no account relation.

## Teacher student registration review — 2026-09-27

- A provisional `Students` row owns a `StudentSessionForm` and a pending
  `StudentTermForm` for the teacher's authorized classroom and term.
- The term form remains the stable key for attendance and assessment work.
  On approval with an existing identity, its `studentId` and score record
  student IDs move to the matched same-school student; the provisional student
  is soft-deleted. Rejection retains the rows but excludes active recording.
