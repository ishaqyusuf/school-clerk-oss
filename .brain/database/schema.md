# Database Schema

## 2026-09-07 Bound Password Recovery

No Prisma change. Framework `reset-password:<token>` Verification rows must now have an additional `password-recovery:v1:<userId>:<SHA-256(token)>` proof with JSON user/email/account/credential ID and matching expiry. Exact lookup requires one current token and one current proof; legacy unbound rows are not automatically trusted or backfilled. A Serializable completion transaction consumes both rows, updates the exact canonical Account credential, clears legacy User.password, invalidates other same-user recovery proofs and soft-revokes stored sessions. Rollback restores all writes together. No live tokens, backfill, migration or DB command ran. See ADR-0033; concurrency and rollout verification deferred.

## 2026-09-07 Staff Invitation Identity/Credential Resolution

No Prisma change. Existing email-linked StaffProfile/User data is treated as ambiguous unless canonical email resolves uniquely, including archived-user collision detection and same-account shared staff checks. Existing Account rows are queried by credential provider and userId OR canonical accountId; only one non-deleted, correctly owned canonical row is accepted. Missing credentials are created inside the Serializable invitation issuance transaction; conflicting or archived rows are never upsert-reassigned/reactivated. Public completion includes canonical accountId in its credential update predicate. No live identity repair, backfill, DB command or schema rollout occurred. See ADR-0032; all verification remains deferred.

## 2026-09-07 Atomic Staff Onboarding Proof

No Prisma change. New staff setup uses two existing Verification rows: `staff-password-setup:<SHA-256(token)>` holds user ID; `id: staff-onboarding:<staffId>` stores the latest bound staff/user/school/account/email/role proof with hashed `staff-onboarding:v1:` identifier. Both expire after 24 hours and are created together. Proof replacement supersedes older links. Completion consumes both rows with exact credential/profile/user updates and Session soft deletion in one serializable transaction. No raw setup secret in these identifiers, no legacy backfill and no runtime data/schema operations. This supersedes generic reset-token reuse for newly issued staff links in the earlier delivery note. See ADR-0029; verification deferred.

## 2026-09-07 Staff Invitation Delivery Binding

No Prisma change. Existing Verification rows now support a `staff-invitation-delivery:v1:` namespace with expiring JSON containing school/account/staff/user/actor IDs, email, role, tenant slug and SHA-256 URL digest. Worker payload references the row ID and exact URL; validation also requires the existing live `reset-password:<token>` Verification value to match that user. These are application-level bindings, not new foreign keys. No rows were created by the agent, no backfill or schema operation ran, and runtime verification remains deferred. See ADR-0028.

## 2026-09-07 Notification Feed Query Policy

No Prisma changes or database operations. New DB-owned feed helpers use existing Notification/NotificationRecipient/NotificationContact relationships for consistent tenant/type/recipient filtering and transactional status writes. Nullable recipient status is interpreted as unread. Session queries now require unexpired sessions and non-deleted users. Hidden history is preserved; reads do not provision contacts. See ADR-0027; all runtime verification remains deferred.

## 2026-09-07 AI History Access Metadata

- Reuses `AssistantConversation.meta.historyAccess` with `{ version: 1, toolNames[] }`; no schema change. Newly created records capture current available tools; pre-run expansion unions new tools under an owned row lock. Scope never shrinks automatically. Legacy/malformed/duplicate metadata is unclassified and withheld without data deletion/backfill.
- Owned row-lock helpers check metadata before title/message/run/analytics reads and serialize transcript appends with scope expansion. List/analytics callbacks use only IDs from the exact rows locked and permitted. Server-generated assistant text/tool parts are the trusted append source; client transcript POST is retired. See ADR-0026; no DB operations or behavioral verification ran.

## 2026-09-07 Atomic AI Mutation Receipts

- Reuses `AssistantToolExecution.output/status/completedAt` and `Activity`; no schema change. Completed mutation output includes `receipt: { version: 1, executionId, completedAt }`. The scoped started execution is completed and activity created inside the domain/approval transaction; failure rolls back all writes. Late error updates skip completed executions.
- Recovery queries match owner/school/run/conversation, allowed tool names, completed mutation status and receipt version. They select outputs/reference/time only, not input or approval tokens. Legacy outputs are not retroactively labeled atomic receipts. No live data actions, schema pushes or behavioral verification ran.

## 2026-09-07 AI Mutation Approval Capabilities

- Reuses `Verification`; no Prisma schema/client generation/push change. `id` is `assistant-confirmation:v2:<random-256-bit-id>`, `identifier` is a serialized namespace/school/user/conversation tuple, `value` is the SHA-256 digest of the signed token, and `expiresAt` matches its ten-minute expiry. Raw token/input is not stored in this capability row.
- DB helpers validate the owned active run/conversation before issuance and consumption. Issuance is create-only, never upsert. Each of the five mutation transactions deletes the exact unexpired approval before domain writes; missing/used rows deny execution, and rollback restores consumption together with domain writes. Wall-clock expiry is rechecked after a possible delete lock wait.
- Existing approval tokens are not backfilled; unversioned/v1 tokens require a fresh preview. Expired records may be removed by normal verification retention without granting access; there is no requirement to retain a consumed-row tombstone. No cleanup or live token creation/consumption was executed by the agent. See [ADR-0025](../decisions/ADR-0025-ai-tool-authorization-and-confirmation.md).

## 2026-09-07 Enrollment Parent Setup Capabilities

- Reuses existing `Verification`, `User`, `Account`, `EnrollmentApplicationParent` and `Guardians` tables; no Prisma schema change or push in this slice.
- `Verification.id` uses `enrollment-parent-setup:<parentId>` for per-parent resend coordination. `identifier` stores that namespace plus a SHA-256 token digest, never the raw token. `value` stores validated application/code/parent/school/account/email scope; expiry is 30 minutes. Explicit confirmation consumes the row atomically with identity linking; a failed delivery deletes only its matching attempted token.
- New parent users are email-verified through the challenge and do not receive an unverified phone-login value. Missing credential initialization is conditional; established passwords are not overwritten. Current `User.email` has no uniqueness constraint: serializable setup protects this flow, but legacy/general auth duplicate-email behavior needs a broader audit before rollout.
- See [ADR-0024](../decisions/ADR-0024-enrollment-parent-email-proof.md). No live tokens/accounts/links were created by the agent and no behavioral verification ran.

## 2026-09-07 Tenant Module Configuration

- Additive `SchoolModuleConfiguration` model: unique `schoolProfileId`, `version` (1), `revision` (0), canonical `enabledModules[]` and `entitledModules[]` string arrays, `updatedByUserId`, and creation/update timestamps.
- A school may have zero or one configuration. Missing configuration is unconfigured, not an enabled-all or disabled-all record. No existing tenant is adopted or reclassified by adding this model.
- Shared utils schemas enforce canonical values, supported version, unique array entries and revision inputs. The resolver intersects requested/granted capabilities and checks transitive dependencies.
- Scoped DB writes include the school ownership predicate and expected version/revision; initial creation uses a scoped relation connect and the unique school constraint. Runtime procedures/enforcement remain in progress.
- See [ADR-0023](../decisions/ADR-0023-tenant-module-policy-resolution.md) and [CORE-002](../tasks/2026-09-07-core-002-tenant-module-controls.md) for rollout status; do not infer deployed readiness from this schema declaration.

## 2026-09-07 Institution Classification Compatibility

- `SchoolProfile.institutionType` remains the existing nullable `String` column; no Prisma/schema rollout or bulk conversion was performed in CORE-001.
- New settings and released signup writes use the shared strict canonical contract, including combined `K12`. DB-owned helpers in `packages/db/src/institution-config.ts` select/update non-deleted schools with an explicit account or authorized platform scope.
- Legacy lowercase and known aliases normalize on read. Unknown strings remain unchanged and display as unclassified in settings. Public website rendering retains its historical K12 fallback without persisting it.
- See [ADR-0022](../decisions/ADR-0022-canonical-institution-type-compatibility.md). Database-enum conversion needs a later explicit data inventory and conversion plan; this stage enforces the application boundary only.

## 2026-08-02 Finance Item Gender Audience

- `FinanceItem.studentGenderAudience` uses `FinanceStudentGenderAudience` with
  `ALL_GENDERS` as the database default.
- Gender-specific values are `MALE_ONLY` and `FEMALE_ONLY`; the field is
  independent of admission audience, classroom scope, and required/optional
  assignment.
- Existing rows require no manual backfill and retain all-gender behavior.

## 2026-07-28 Admission Classification And Fee Audience

- `StudentTermForm.admissionType` uses `StudentTermAdmissionType` with
  `UNCLASSIFIED` as the database default.
- `StudentTermForm` has an index across school, term, and admission type for
  directory filters and analytics.
- `FinanceItem.studentAudience` uses `FinanceStudentAudience` with
  `ALL_STUDENTS` as the database default.
- `FinanceCharge.assignmentSource` uses `FinanceChargeAssignmentSource` to
  record `REQUIRED_AUTO`, `OPTIONAL_SELECTED`, or `MANUAL` provenance for new
  item-backed and manual charges. It is nullable for legacy charge rows.
- Existing rows require no manual backfill and retain safe default behavior.

## Purpose

Tracks logical and physical schema for SchoolClerk data entities.

## How To Use

- Update when tables/collections or key fields change.
- Keep tenant-related fields explicit.
- Link migrations for implementation details.

## Source Of Truth

- Prisma schema location: `packages/db/src/schema/*.prisma`
- Primary datasource: Neon PostgreSQL in production (`provider = "postgresql"`)
- ORM client: Prisma Client 7 (`prisma-client-js`) generated to `packages/db/src/generated/client`
- Runtime adapter: `@prisma/adapter-pg`; `packages/db/src/prisma.ts` resolves the canonical `DATABASE_URL` and normalizes PostgreSQL SSL connection parameters. Production runtimes use Neon's pooled URL, while administrative restore and validation work uses its direct URL.
- Development infra selects `SCHOOL_CLERK_DB_MODE=preview` or `local` and exports the final `DATABASE_URL` used by Prisma maintenance commands. `local-infra-kit/bin/db.ts` runs guarded Prisma commands from `packages/db`; `packages/db/prisma.config.ts` reads only `DATABASE_URL`.

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

### SchoolProfile Academic Data Direction (added — session 2026-07)

| Field                       | Type                        | Notes                                                    |
| --------------------------- | --------------------------- | -------------------------------------------------------- |
| `academicDataDirectionMode` | `AcademicDataDirectionMode` | Defaults to `AUTO`; controls only academic data surfaces |

`AcademicDataDirectionMode` values:

- `AUTO`: resolve from bounded tenant academic-data samples.
- `LTR`: force academic data surfaces left-to-right.
- `RTL`: force academic data surfaces right-to-left.

The setting does not control application language, global document direction, or dashboard chrome.

### SchoolProfile Student Name Format (added — session 2026-07)

| Field               | Type                | Notes                                                              |
| ------------------- | ------------------- | ------------------------------------------------------------------ |
| `studentNameFormat` | `StudentNameFormat` | Defaults to `FIRST_SURNAME_OTHER`; controls student display order |

`StudentNameFormat` values:

- `FIRST_SURNAME_OTHER`: first name, surname, other name.
- `SURNAME_FIRST_OTHER`: surname, first name, other name.
- `FIRST_OTHER_SURNAME`: first name, other name, surname.

The field is a tenant-wide presentation preference. It does not rewrite `Students.name`, `Students.surname`, or `Students.otherName`.

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
- `StudentImportJob`, `StudentImportJobRow`
- `StaffProfile`, `StaffTermProfile`, `StaffClassroomDepartmentTermProfiles`, `StaffSubject`, `StaffAcademicAccessGrant`
- `StaffAcademicAccessGrant.scope` supports `CLASS`, `DEPARTMENT`, `CLASS_SUBJECT`, and `DEPARTMENT_SUBJECT` for hierarchy-aware teacher academic access. Grants are term-owned through `StaffTermProfile` and may reference `ClassRoom`, `ClassRoomDepartment`, `Subject`, or `DepartmentSubject` depending on scope.
- Legacy classroom/subject assignment rows remain active compatibility inputs to the effective teacher access resolver.

### StudentImportJob (updated — session 2026-07)

| Field               | Type   | Notes                                                                               |
| ------------------- | ------ | ----------------------------------------------------------------------------------- |
| `id`                | String | PK                                                                                  |
| `schoolProfileId`   | String | Tenant ownership boundary                                                           |
| `schoolSessionId`   | String | Active session captured when the job is created                                     |
| `sessionTermId`     | String | Active term captured when the job is created                                        |
| `createdByUserId`   | String | Optional dashboard operator id                                                      |
| `status`            | Enum   | `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_FAILURES`, `FAILED`, `CANCELLED` |
| `totalRows`         | Int    | Number of executable reviewed rows persisted for the job                            |
| `processedRows`     | Int    | Count of rows with final row status                                                 |
| `createdStudents`   | Int    | Aggregate created student rows                                                      |
| `keptMatches`       | Int    | Aggregate existing-student keep rows                                                |
| `updatedMatches`    | Int    | Aggregate matched-name update rows                                                  |
| `termSheetsCreated` | Int    | Aggregate newly created term sheets                                                 |
| `skippedRows`       | Int    | Aggregate skipped rows                                                              |
| `failedRows`        | Int    | Aggregate failed rows                                                               |
| `errorMessage`      | String | Optional whole-job failure message                                                  |
| `triggerRunId`      | String | Optional Trigger.dev run id                                                         |

### StudentImportJobRow (updated — session 2026-07)

| Field              | Type   | Notes                                                                   |
| ------------------ | ------ | ----------------------------------------------------------------------- |
| `id`               | String | PK                                                                      |
| `jobId`            | String | Parent `StudentImportJob`                                               |
| `lineNumber`       | Int    | Original reviewed import line number                                    |
| `action`           | String | `import_new`, `keep_match`, or `update_match_with_name`                 |
| `status`           | Enum   | `PENDING`, `RUNNING`, `CREATED`, `KEPT`, `UPDATED`, `SKIPPED`, `FAILED` |
| `payload`          | Json   | Normalized execution row payload                                        |
| `studentId`        | String | Optional affected student id                                            |
| `termSheetCreated` | Bool   | Whether this row created a term sheet                                   |
| `reason`           | String | Row-level failure or diagnostic reason                                  |
| `completedAt`      | Date   | Timestamp when a row reaches final status                               |

`StudentImportJobRow` is unique by `(jobId, lineNumber)` so retries cannot create duplicate result rows for the same reviewed line.

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

- `ClassRoomAttendance`, `StudentAttendance`, `AttendanceSessionRevision`, `AttendanceSessionGuard`
- `ClassroomSubjectAssessment`, `StudentAssessmentRecord`, `StudentAssessmentRecordHistory`
- `AssessmentWorkbookExport`, `AssessmentWorkbookImport`

### Attendance Sessions (expanded — session 2026-07)

- `ClassRoomAttendance` stores the explicit attendance date, `GENERAL` or `SUBJECT` scope, optional period label, active `SessionTerm`, optional `DepartmentSubject`, staff recorder, compatibility idempotency/dedupe keys, an idempotency payload hash, and a monotonically increasing revision.
- `StudentAttendance.status` supports `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `SICK`, and `LEAVE`. The legacy nullable `isPresent` flag remains populated and readable for compatibility.
- `AttendanceSessionRevision` is an append-only session audit record with action (`CREATED`, `UPDATED`, or `DELETED`), actor identity, JSON snapshot, and timestamp.
- `AttendanceSessionGuard` atomically claims tenant-scoped `IDEMPOTENCY` and `DEDUPE` keys through the unique `(schoolProfileId, kind, key)` constraint. It is intentionally separate from historical attendance rows, avoiding a destructive uniqueness backfill.
- Attendance indexes cover tenant/term/deletion state, classroom/term/date, subject/date, student-term-form history, session student rows, revisions, and guard ownership.
- Legacy attendance rows remain readable: null scope resolves to general, null date resolves to creation time, and null explicit status resolves from `isPresent`.

### Assessment Score Value History (added — session 2026-07)

`StudentAssessmentRecordHistory` is the append-only audit trail for every normal assessment score create or update.

| Field                       | Type     | Notes                                                                                 |
| --------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `schoolProfileId`           | String   | Tenant ownership boundary                                                             |
| `studentAssessmentRecordId` | Int?     | Nullable relation to the current score row; preserved snapshots survive hard deletion |
| `studentId`                 | String   | Student identity snapshot                                                             |
| `studentTermFormId`         | String   | Term-form identity snapshot                                                           |
| `classSubjectAssessmentId`  | Int      | Assessment identity snapshot                                                          |
| `previousObtained`          | Float?   | Value before the write; null for a new score                                          |
| `newObtained`               | Float?   | Value after the write, including an explicitly cleared score                          |
| `changeType`                | Enum     | `CREATE` or `UPDATE`                                                                  |
| `source`                    | Enum     | `AUTHENTICATED_ENTRY`, `PUBLIC_LINK`, `WORKBOOK_IMPORT`, or `AI_TOOL`                 |
| `actorUserId`, `actorName`  | String?  | Authenticated or recorded actor provenance when available                             |
| `sourceReference`           | String?  | Public link, workbook export, or tool execution reference                             |
| `metadata`                  | Json?    | Source-specific bounded context                                                       |
| `createdAt`                 | DateTime | Immutable write timestamp                                                             |

The canonical current value remains in `StudentAssessmentRecord`. History creation and the canonical score write occur in the same transaction.

### Assessment Workbook Audit Models (added — session 2026-07)

`AssessmentWorkbookExport` stores the issued workbook id, tenant, original term/classroom binding, schema version, actor, generation time, optional revocation time, and related imports.

`AssessmentWorkbookImport` stores the export relation, tenant/term/classroom binding, tenant-scoped idempotency key, SHA-256 file digest, JSON outcome summary, created standalone assessment ids, actor, and apply/create/update timestamps.

- `(schoolProfileId, idempotencyKey)` is unique so retry confirmations cannot duplicate score writes.
- Export deletion is restricted while imports refer to it.
- Import summary storage is audit metadata; current assessment scores remain canonical in `StudentAssessmentRecord`.
- Activity types `assessment_workbook_downloaded` and `assessment_workbook_imported` record tenant audit events.

### ClassroomSubjectAssessment Obtainable (updated — session 2026-07)

| Field        | Type     | Notes                                                                                                    |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `obtainable` | `Float?` | Nullable raw-score maximum. `null` is allowed only for standalone `0%`-weight informational assessments. |

- A numeric value is enforced as the score upper bound.
- `null` accepts any finite non-negative score without an upper bound; it does not represent a student-specific denominator.
- Positively weighted standalone assessments and every grouped-assessment child require a positive value.
- Grouped parents continue deriving their effective maximum from child assessments.

### ClassroomSubjectAssessment Print Mode (added — session 2026-07)

| Field       | Type                                  | Notes                                                                 |
| ----------- | ------------------------------------- | --------------------------------------------------------------------- |
| `printMode` | `ClassroomSubjectAssessmentPrintMode` | Defaults to `EXPANDED`; meaningful on grouped parent assessments only |

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
- Standardized finance ledger models: `FinanceStream`, `FinanceItem`, `FinanceCharge`, `FinancePayment`, `FinancePaymentAllocation`, `FinanceTransfer`, and `FinanceLedgerEntry`.
- `FinanceCharge.schoolSessionId` / `FinanceCharge.sessionTermId` represent the academic period the obligation is for.
- `FinancePayment.collectedSchoolSessionId` / `FinancePayment.collectedSessionTermId` represent the operational period when cash was collected.
- `FinanceLedgerEntry.collectedSchoolSessionId` / `FinanceLedgerEntry.collectedSessionTermId` scope account/stream balances and statements by collection term. This allows a payment collected in the current term for a previous-term charge to affect current-term cash while still reducing the previous-term obligation through `FinancePaymentAllocation`.
- Term account statements prefer collected-in term fields and fall back to charge term fields for older ledger rows created before collected-in attribution existed.
- `FinanceTermLedgerClose` stores durable close snapshots for a term ledger, including status, close/reopen metadata, and a JSON summary.
- `FinanceTermCarryForward` stores per-account carry-forward rows from a closed term to a next term. When a next term is available, close creates opening `FinanceLedgerEntry` adjustment rows scoped to the next term.
- `FinancePayee` stores reusable vendors, casual workers, service providers, staff-like external payees, and other non-student/non-staff recipients. Payees link to finance charges, payments, and purchases so vendor/casual-worker history can be reused across finance workflows.
- `FinancePayrollStructure` stores reusable salary/wage structures for staff, including cadence (`MONTHLY`, `TERM`, `DAILY`, `HOURLY`, `TASK`, `ONE_OFF`), base amount, allowances, deductions, advances, bonuses, computed net amount, role label, and linked salary/wages stream.
- `FinancePurchase` stores purchase/service/expense/labor/reimbursement records funded from finance streams. Purchases link to the canonical `FinanceCharge` payable and optional `FinancePayment` when paid immediately, so the account statement remains the source of truth while the purchase record explains vendor, item/service, quantity, cost, receipt/reference, and status.
- `FinancePaymentImportJob` stores the tenant/session/term, import mode, payment
  method, source filename, creator, Trigger run id, durable status, row counters,
  and amount totals for one reviewed historical payment batch.
- `FinancePaymentImportJobRow` stores one persisted normalized row, semantic
  fingerprint, counterparty/term-sheet/stream/item decisions, execution status,
  canonical charge/payment/allocation/ledger result ids, and failure details.

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

## Academic Term Lifecycle

- `SchoolProfile.activeSessionTermId` is the nullable canonical active-term foreign key.
- `SessionTerm.lifecycleStatus` is nullable for legacy compatibility and uses `DRAFT`, `READY`, `ACTIVE`, or `CLOSED`.
- `SessionTerm` stores setup completion, activation, closure, actor, and note metadata.
- `AcademicTermSetupRun` stores tenant/source/target ids, unique tenant idempotency key, status, configuration/result JSON, error, actor, and timestamps.
- `ClassRoomAttendance.sessionTermId` directly attributes new attendance sessions to a term.
- `StaffTermProfile` remains the term-specific teacher record; its lookup index covers `staffProfileId`, `sessionTermId`, and `deletedAt`.

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
# QA account lifecycle

- `SaasAccount` stores classification, source QA domain, marked timestamp, and
  purge-start timestamp; all owned schools inherit this boundary.
- Global `QaPurgeRun` stores actor, timestamps, status, aggregate workspace,
  school, record, and file counts, plus error category only.
# Staff invitation generation follow-up (2026-09-07, no schema change)

Existing Verification and StaffProfile rows now support atomic capability/latest-proof/PENDING issuance. A conditional write to the exact unexpired latest proof holds a row lock through queue-failure status or direct in-app notification persistence. No expiry extension, migration or new table is introduced. Resend timestamps represent issuance, not email delivery. See ADR-0031; concurrency/rollback is untested and all database operations remain deferred for this slice.
# Signup email verification record contract — 2026-09-08

School signup (ADR-0041) reuses existing SaasAccount, SchoolProfile, TenantDomain, User and Account models in one Serializable transaction. New owner has role Admin, emailVerified=false, password=null and saasAccountId set at creation; canonical credential stores the Better Auth hash with providerId=credential and accountId=userId. No Session is created by signup. Explicit empty `deletedAt` filters intentionally include archived records in collision reads despite the client extension; normal live reads retain their default. No schema/DB operation or global email-uniqueness constraint added.

Self-service reissue also reuses `Verification` ID `signup-email-reissue:<userId>`, identifier `signup-email-reissue:v1`, value = acting user ID and expiry = next allowed issuance (60 seconds). A Serializable transaction reads current live owner/session/school context and cooldown, then replaces the proof and cooldown together. Expired cooldown rows are reused, not bulk-cleaned. A delivery failure does not remove the cooldown. No schema/DB operation was performed.

Existing `Verification` storage is reused without a Prisma schema change. New signup proofs use deterministic ID `signup-email:<userId>`, identifier `signup-email:v1:<SHA256(token)>`, 24-hour expiry and canonical JSON `{ userId, email, accountId, schoolId, tenantSlug, role }`. Issuance replaces this user's prior proof; completion consumes the exact ID/identifier/value/live expiry and conditionally verifies the matching live user in a Serializable transaction. Legacy `email-verification:<uuid>` records remain stored but are no longer accepted by the app page/action. No DB operation or automatic backfill/deletion was run. See ADR-0040; concurrency/rollback verification remains deferred.

## Teacher student registration review — 2026-09-27

`StudentTermForm` has `registrationReviewStatus` (`APPROVED` default,
`PENDING`, `REJECTED`), requester/reviewer user IDs, reviewed timestamp and
review note. The school/status/term index supports review and active-roster
queries. Existing term forms remain approved by default. Local schema push
succeeded; production push is pending this local QA round.
