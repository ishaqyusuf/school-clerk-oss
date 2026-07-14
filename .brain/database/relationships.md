# Database Relationships

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
