# Database Schema

## Purpose

Tracks logical and physical schema for SchoolClerk data entities.

## How To Use

- Update when tables/collections or key fields change.
- Keep tenant-related fields explicit.
- Link migrations for implementation details.

## Source Of Truth

- Prisma schema location: `packages/db/src/schema/*.prisma`
- Primary datasource: PostgreSQL (`provider = "postgresql"`)
- ORM client: Prisma Client 7 (`prisma-client-js`) generated to `packages/db/src/generated/client`
- Runtime adapter: `@prisma/adapter-pg`; `packages/db/src/prisma.ts` resolves `DATABASE_URL` only and normalizes PostgreSQL SSL connection parameters for Supabase-compatible deployments.
- Development infra uses `scripts/with-dev-infra.ts` to select `SCHOOL_CLERK_DB_MODE=remote-dev` or `local` and then exports the final `DATABASE_URL` used by Prisma maintenance commands. `scripts/db-command.ts` runs Prisma from `packages/db` with that resolved `DATABASE_URL`; `packages/db/prisma.config.ts` intentionally stays GND-style and only reads `DATABASE_URL`. The jobs package uses the same env resolver for local Trigger development, refreshes its flattened Prisma schema before dev/deploy, and invokes the Trigger CLI through Node to avoid Bun bin-runner crashes.

## Active Model Groups

## Tenant and Identity

- `SaasAccount`, `User`, `Session`, `Account`, `Verification`, `EmailTokenLogin`
- `SchoolProfile`, `TenantDomain`, `SchoolSession`, `SessionTerm`
- Planned public website models: `WebsiteTemplateConfig`, `WebsitePublishedConfig`

### TenantDomain (schema: `packages/db/src/schema/school.prisma`)

| Field             | Type           | Notes                                                                                    |
| ----------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `id`              | String (uuid)  | PK                                                                                       |
| `subdomain`       | String? unique | Slug only — `"daarulhadith"`. Never the full URL. Auto-set on school creation            |
| `customDomain`    | String? unique | Full user-provided domain — `"myschool.org"`. Nullable                                   |
| `isPrimary`       | Boolean        | Default true                                                                             |
| `isVerified`      | Boolean        | Default false. True for auto-generated subdomains; requires DNS check for custom domains |
| `schoolProfileId` | String?        | FK → SchoolProfile                                                                       |
| `saasAccountId`   | String?        | FK → SaasAccount (denormalized for fast account-level queries)                           |

Dashboard URL derived in middleware — never stored: `dashboard.{subdomain}.school-clerk.com`

### Verification Usage

- Signup owner email verification reuses the existing `Verification` model.
- Identifier format: `email-verification:{token}`.
- Value: `User.id`.
- Expiry: 24 hours after signup.
- Successful verification sets `User.emailVerified = true` and deletes the verification row.

### Planned WebsiteTemplateConfig (design target for `WEB-002`)

| Field             | Type          | Notes                                                                 |
| ----------------- | ------------- | --------------------------------------------------------------------- |
| `id`              | String (uuid) | PK                                                                    |
| `schoolProfileId` | String        | FK → SchoolProfile. Tenant ownership boundary                         |
| `templateId`      | String        | Registry template identifier such as `k12-plus-template-1`            |
| `name`            | String        | Tenant-facing draft/published config label                            |
| `status`          | Enum          | `DRAFT`, `PUBLISHED`, `ARCHIVED`                                      |
| `contentJson`     | Json          | Saved editable field values by stable field key                       |
| `sectionJson`     | Json          | Section visibility map by stable section key                          |
| `themeJson`       | Json          | Colors, fonts, radius, density, style preset, and other visual config |
| `seoJson`         | Json?         | Site-wide and page-level SEO overrides                                |
| `analyticsJson`   | Json?         | Public tracking/meta settings                                         |
| `templateVersion` | Int           | Enables template migration/version compatibility rules                |
| `createdByUserId` | String?       | Optional author/auditing user link                                    |
| `updatedByUserId` | String?       | Optional last editor user link                                        |
| `publishedAt`     | DateTime?     | Timestamp of the last publish event for this config                   |
| `createdAt`       | DateTime      | Audit field                                                           |
| `updatedAt`       | DateTime      | Audit field                                                           |

### Planned WebsitePublishedConfig (design target for `WEB-002`)

| Field             | Type          | Notes                                                  |
| ----------------- | ------------- | ------------------------------------------------------ |
| `id`              | String (uuid) | PK                                                     |
| `schoolProfileId` | String unique | Exactly one published pointer per tenant               |
| `websiteConfigId` | String unique | FK → WebsiteTemplateConfig. Active live website config |
| `publishedAt`     | DateTime      | Publish event timestamp                                |

### Public Website Persistence Notes

- Website configuration data should be stored in dedicated website tables rather than inflating `SchoolProfile` with large website JSON blobs.
- `WebsiteTemplateConfig` is the durable draft/published document for a tenant website configuration.
- `WebsitePublishedConfig` is the fast lookup pointer used by `apps/school-site` to resolve the live public website.
- `publishedAt` marks a config row as historically published and immutable for content/theme/section/SEO edits.
- Superseded live config rows should move to `ARCHIVED` when a new draft is published.
- `templateVersion` should be captured at save/publish time so future manifest migrations can be deterministic.
- Page content, section visibility, and theme settings are intentionally JSON-backed because template field sets vary by template and page.

## Academic Structure

- `ClassRoom`, `ClassRoomDepartment`, `DepartmentSubject`, `Subject`
- `Students`, `StudentSessionForm`, `StudentTermForm`
- `StaffProfile`, `StaffTermProfile`, `StaffClassroomDepartmentTermProfiles`, `StaffSubject`, `StaffAcademicAccessGrant`
- `StaffAcademicAccessGrant.scope` supports `CLASS`, `DEPARTMENT`, `CLASS_SUBJECT`, and `DEPARTMENT_SUBJECT` for hierarchy-aware teacher academic access. Grants are term-owned through `StaffTermProfile` and may reference `ClassRoom`, `ClassRoomDepartment`, `Subject`, or `DepartmentSubject` depending on scope.
- Legacy classroom/subject assignment rows remain active compatibility inputs to the effective teacher access resolver.

### Classroom Search Indexes (updated — session 2026-06)

- Find Anything classroom search is backed by active-row indexes on `ClassRoom.schoolProfileId + schoolSessionId` and `ClassRoomDepartment.schoolProfileId`.
- Trigram search indexes support fuzzy matching on `ClassRoom.name` and `ClassRoomDepartment.departmentName`.
- These indexes are search/read optimizations only and do not change classroom relationships or write behavior.

### StaffProfile (updated — session 2026-04)

| Field             | Type      | Notes                                                                        |
| ----------------- | --------- | ---------------------------------------------------------------------------- |
| `name`            | String    | Placeholder display name is derived from email until onboarding is completed |
| `email`           | String?   | Required by the current invite-first staff admin flow                        |
| `inviteStatus`    | String?   | `NOT_SENT`, `PENDING`, `ACTIVE`, `FAILED`                                    |
| `inviteSentAt`    | DateTime? | Latest onboarding email send timestamp                                       |
| `inviteResentAt`  | DateTime? | Latest resend timestamp                                                      |
| `lastInviteError` | String?   | Last delivery failure message for admin follow-up                            |
| `onboardedAt`     | DateTime? | Timestamp set after staff completes password + profile onboarding            |

### Staff Assignment Shape (updated — session 2026-07)

- Admin-side staff creation is now invite-first: email + role + teaching assignments.
- Teaching assignments are modeled as repeated classroom entries, each with `subjectAccessMode`.
- `StaffClassroomDepartmentTermProfiles.subjectAccessMode` uses `StaffClassroomSubjectAccessMode` with values `SELECTED` and `ALL`, defaulting to `SELECTED`.
- `SELECTED` assignments use `StaffSubject` rows for explicit active-term `DepartmentSubject` access.
- `ALL` assignments grant access to all current and future active-term subjects in the assigned classroom without creating explicit `StaffSubject` rows.
- Only teacher-role staff should receive classroom and subject assignment payloads; non-teaching roles persist with empty assignment sets.

## Attendance and Assessment

- `ClassRoomAttendance`, `StudentAttendance`
- `ClassroomSubjectAssessment`, `StudentAssessmentRecord`

### ClassroomSubjectAssessment Print Mode (added — session 2026-07)

| Field       | Type                                    | Notes                                                                 |
| ----------- | --------------------------------------- | --------------------------------------------------------------------- |
| `printMode` | `ClassroomSubjectAssessmentPrintMode`   | Defaults to `EXPANDED`; meaningful on grouped parent assessments only |

`ClassroomSubjectAssessmentPrintMode` values:

- `EXPANDED`: print weighted child assessments as separate `Parent - Child` columns.
- `TOTAL`: print one parent total column using the summed weighted child scores.

Child assessment rows remain the scoreable records. Grouped parent rows are containers and must not receive direct `StudentAssessmentRecord` scores.

### AssessmentPublicLink (added — session 2026-07)

| Field                                                              | Type           | Notes                                                                                           |
| ------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------- |
| `schoolProfileId`                                                  | String         | Tenant ownership boundary                                                                       |
| `sessionTermId`                                                    | String         | Term whose result sheet is exposed                                                              |
| `classRoomDepartmentId`                                            | String         | Classroom/department scope for the link                                                         |
| `status`                                                           | Enum           | `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, or `REVOKED`                                      |
| `tokenHash`                                                        | String? unique | SHA-256 hash of the signed public token; plaintext token is only returned when created/approved |
| `requestedDurationHours`                                           | Int            | Expiry duration selected/requested, for example 24, 48, or 168 hours                            |
| `selectedDepartmentSubjectIds`                                     | String[]       | Subject filter snapshot captured from the current assessment-recording query                    |
| `selectedStudentTermFormIds`                                       | String[]       | Optional student filter snapshot for future narrowed result-entry links                         |
| `reason`, `rejectionReason`                                        | String?        | Staff request reason and optional admin rejection note                                          |
| requester/approver/rejecter/revoker fields                         | String?        | User IDs and display names for audit and notification copy                                      |
| `approvedAt`, `rejectedAt`, `revokedAt`, `expiresAt`, `lastUsedAt` | DateTime?      | Lifecycle and usage timestamps                                                                  |
| `deletedAt`                                                        | DateTime?      | Soft-delete marker                                                                              |

Assessment public links are tenant-scoped and store only the hash of the externally shared token. Approved links expose the classroom report sheet for the captured classroom, term, subject filter, and optional student filter until expiry or revocation.

The composite assessment public-link lookup index on `schoolProfileId`, `sessionTermId`, and `classRoomDepartmentId` uses the explicit PostgreSQL-safe map name `AssessmentPublicLink_schoolProfileId_sessionTermId_classRoo_idx` to avoid Prisma/PostgreSQL truncation drift.

## Finance

- `Wallet`, `WalletTransactions`, `StudentWalletTransactions`, `Funds`
- `Fees`, `FeeHistory`, `StudentFee`, `StudentPayment`, `StudentPurchase`
- `Billable`, `BillableHistory`, `Bills`, `BillInvoice`, `BillPayment`

### FeeHistory (updated — session 2025-04)

| Field                  | Type                  | Notes                                                                                  |
| ---------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `walletId`             | String?               | FK → Wallet. Routes payments to the correct accounting stream for this fee             |
| `classroomDepartments` | ClassRoomDepartment[] | Implicit M:N via `_ClassRoomDepartmentToFeeHistory`. Empty = applies to all classrooms |

### Concept Clarification (session 2025-04)

- **`Fees` / `FeeHistory`** — Student-facing fees. Supports per-term pricing, accounting stream targeting, and optional classroom scoping. The correct model for anything billed to students (tuition, levies, etc.)
- **`Billable` / `BillableHistory`** — Staff/service-facing charges only. `BillType: SALARY | MISC | OTHER`. Drives `Bills` for payroll and operational expenses. Do NOT use for student fees.

## Other

- `Guardians`, `Activity`, `Posts`
- `AssistantConversation`, `AssistantMessage`, `AssistantRun`, `AssistantToolExecution`, `SchoolAssistantConfig`, `AssistantFeedback`

## Admissions And Parent Portal

- `EnrollmentLink`, `EnrollmentLinkClassroom`, `EnrollmentLinkDocumentRequirement`
- `EnrollmentApplication`, `EnrollmentApplicationParent`, `EnrollmentApplicationDocument`
- `SchoolDocumentTemplatePreference`, `CustomDocumentTemplateRequest`

### EnrollmentLink (planned implementation — session 2026-06)

| Field                 | Type          | Notes                                                                                                                                          |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `schoolProfileId`     | String        | Tenant ownership boundary                                                                                                                      |
| `code`                | String unique | Public token used by school-site enrollment URLs                                                                                               |
| `status`              | Enum          | `ACTIVE`, `PAUSED`, `ARCHIVED`                                                                                                                 |
| `showOnWebsite`       | Boolean       | Controls whether active/in-window links are eligible for public website admission sections; manual direct sharing remains available when false |
| `capacityMode`        | Enum          | `TOTAL` or `PER_CLASSROOM`                                                                                                                     |
| `totalCapacity`       | Int?          | Used when capacity mode is total                                                                                                               |
| `opensAt`, `closesAt` | DateTime?     | Optional public availability window                                                                                                            |

### EnrollmentLinkClassroom (updated — session 2026-06-30)

| Field                                  | Type      | Notes                                                                      |
| -------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `enrollmentLinkId`                     | String    | FK → `EnrollmentLink`                                                      |
| `classRoomDepartmentId`                | String    | FK → `ClassRoomDepartment`; allowed class option for the link              |
| `capacity`                             | Int?      | Used when capacity mode is per-classroom                                   |
| `minimumAgeMonths`, `maximumAgeMonths` | Int?      | Optional selected-class age rule, stored in months for exact validation    |
| `ageCutoffDate`                        | DateTime? | Optional date used to calculate applicant age for this class               |
| `requirementNotes`                     | String?   | Class-specific admission instructions shown after parent selects the class |

### EnrollmentLinkDocumentRequirement (updated — session 2026-06-30)

| Field                   | Type            | Notes                                                                                                                                         |
| ----------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `enrollmentLinkId`      | String          | FK → `EnrollmentLink`                                                                                                                         |
| `classRoomDepartmentId` | String?         | Optional FK → `ClassRoomDepartment`; null means the document applies to all classes on the link                                               |
| `label`, `description`  | String, String? | Parent-facing document requirement copy                                                                                                       |
| `documentType`          | String          | Stable requirement kind such as `GENERAL`, `PASSPORT_PHOTO`, `BIRTH_CERTIFICATE`, `PREVIOUS_SCHOOL_REPORT`, or `OTHER`; defaults to `GENERAL` |
| `uploadRequired`        | Boolean         | Required upload flag enforced during public submission and admin approval                                                                     |
| `sortOrder`             | Int             | Parent/admin display ordering                                                                                                                 |

### EnrollmentApplication (updated — session 2026-06-30)

| Field                                                         | Type              | Notes                                                                                           |
| ------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `enrollmentLinkId`                                            | String            | FK → `EnrollmentLink`                                                                           |
| `classRoomDepartmentId`                                       | String            | Selected allowed classroom department                                                           |
| `studentFirstName`, `studentSurname`, `studentOtherName`      | String            | Submitted student identity                                                                      |
| `studentDob`, `studentGender`                                 | DateTime?, Gender | Submitted student profile details                                                               |
| `status`                                                      | Enum              | `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN`                                |
| `acceptedStudentId`, `acceptedTermFormId`                     | String?           | Populated when staff approval creates/links student records                                     |
| `admissionPaymentRequired`                                    | Boolean           | Whether the approval email should present an admission payment handoff                          |
| `admissionPaymentLabel`                                       | String?           | Admin-facing/parent-facing payment label, for example admission fee                             |
| `admissionPaymentAmount`, `admissionPaymentCurrency`          | Decimal?, String? | Payment amount and ISO-style currency code stored with the approval decision                    |
| `admissionPaymentInstructions`, `admissionPaymentLink`        | String?, String?  | Parent-facing payment instructions and optional external payment URL                            |
| `admissionPaymentDueAt`                                       | DateTime?         | Optional payment due date set during approval                                                   |
| `admissionApprovalEmailSentAt`                                | DateTime?         | Timestamp recorded after the successful-admission email is sent                                 |
| `admissionLetterTemplateId`, `admissionLetterTemplateVersion` | String?, Int?     | Admission-letter PDF template selected during approval and used by the parent-facing letter URL |

### EnrollmentApplicationDocument (updated — session 2026-06-30)

| Field                           | Type             | Notes                                                                                                                                              |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enrollmentApplicationId`       | String           | FK → `EnrollmentApplication`                                                                                                                       |
| `requirementId`                 | String?          | Optional FK → `EnrollmentLinkDocumentRequirement`                                                                                                  |
| `documentType`                  | String           | Copied stable document kind from the requirement at upload time so passport/photo files remain identifiable during review and later PDF generation |
| `fileName`, `fileUrl`           | String, String   | Original file name and stored blob URL                                                                                                             |
| `storageProvider`, `storageKey` | String?, String? | Upload provider metadata for future signed/proxy access                                                                                            |
| `mimeType`, `sizeBytes`         | String?, Int?    | Upload validation and audit metadata                                                                                                               |
| `reviewStatus`                  | Enum             | `PENDING`, `APPROVED`, or `REJECTED`                                                                                                               |

### SchoolDocumentTemplatePreference (updated — session 2026-06-30)

| Field             | Type      | Notes                                                                                                     |
| ----------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `schoolProfileId` | String    | Tenant ownership boundary                                                                                 |
| `documentType`    | String    | Document family, currently `RESULT_SHEET`, `ADMISSION_LETTER`, or `ADMISSION_FORM`                        |
| `templateId`      | String    | Stable template ID from the shared registry or a ready custom template request                            |
| `templateVersion` | Int       | Version used to render the selected template                                                              |
| `source`          | String    | `code`, `json`, or `custom`                                                                               |
| `deletedAt`       | DateTime? | Soft-delete marker; active preferences are unique per school/document type through a partial unique index |

### CustomDocumentTemplateRequest (updated — session 2026-07-01)

| Field                                                               | Type                            | Notes                                                                               |
| ------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `schoolProfileId`                                                   | String                          | Tenant ownership boundary                                                           |
| `documentType`                                                      | String                          | Requested document family such as admission letter, admission form, or result sheet |
| `title`, `notes`                                                    | String, String?                 | School-facing request label and build instructions                                  |
| `status`                                                            | Enum                            | `SUBMITTED`, `QUOTED`, `PAID`, `IN_BUILD`, `READY`, or `REJECTED`                   |
| `sourceFileName`, `sourceFileUrl`                                   | String?, String?                | Uploaded existing PDF/scan metadata for the custom build                            |
| `storageProvider`, `storageKey`, `mimeType`, `sizeBytes`            | String?, String?, String?, Int? | Upload provider and validation metadata                                             |
| `quotedAmount`, `quotedCurrency`                                    | Decimal?, String?               | Optional paid custom-build quote metadata                                           |
| `quotePaymentInstructions`, `quotePaymentLink`, `quotePaymentDueAt` | String?, String?, DateTime?     | Dashboard-visible payment handoff details for quoted custom template builds         |
| `builtTemplateId`, `builtTemplateVersion`                           | String?, Int?                   | Stable finished-template identity after the build is ready                          |
| `builtTemplateJson`                                                 | Json?                           | Validated constrained JSON template used for custom preview/PDF rendering           |
| `operatorNotes`, `requestedByUserId`                                | String?, String?                | Internal build notes and requester audit metadata                                   |

### Parent Portal Identity Bridge (planned implementation — session 2026-06)

- `Guardians.userId` links an authenticated `Parent` user to the guardian profile that owns ward relationships.
- Parent portal reads should use `Guardians.userId` as the primary authorization join rather than matching by phone number alone.

### Assistant Data Model (session 2026-04)

| Model                    | Purpose                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `AssistantConversation`  | Tenant-user scoped conversation shell with title, locale, summary, and last-message timestamp                                              |
| `AssistantMessage`       | Durable user/assistant/system messages with stored UI parts and workflow state                                                             |
| `AssistantRun`           | One assistant request/response cycle with provider, model, prompt summary, usage, and status                                               |
| `AssistantToolExecution` | Per-tool audit row inside a run, including blocked/completed/failed status and mutation flag                                               |
| `SchoolAssistantConfig`  | Per-tenant assistant controls for rollout, provider/model selection, allowed roles, enabled/disabled capabilities, analytics, and feedback |
| `AssistantFeedback`      | Tenant-user feedback linked to a conversation and/or run                                                                                   |

### Assistant Audit Notes

- Assistant persistence is tenant-scoped through `schoolProfileId`.
- Assistant run and tool records complement, rather than replace, broader `Activity` audit rows.
- Risky assistant mutations use confirmation tokens and emit assistant-specific activity events before or after execution.

## Legacy/Parallel Models Detected

- `schema.prisma` also contains lowercase legacy models: `school`, `guardian`, `session_class`.
- These coexist with PascalCase domain models and should be consolidated to one canonical set.

## Schema Notes

- Tenant key strategy in active models: `schoolProfileId` is widely used for tenant scoping.
- Soft delete pattern: most models use nullable `deletedAt`; legacy models use `deleted_at`.
- Auditing fields: `createdAt` and `updatedAt` present across most active models.
- Planned website config uniqueness rule: multiple configs per tenant are allowed, but only one row in `WebsitePublishedConfig` may point to the active live config for that tenant.
- Planned website config status rule: `PUBLISHED` should only be assigned as part of a publish transaction that also updates `WebsitePublishedConfig`.
- Planned website config immutability rule: rows with `publishedAt` should not be edited directly; duplicate into a draft for changes.
- TODO: document which models are production-active vs transitional legacy.
