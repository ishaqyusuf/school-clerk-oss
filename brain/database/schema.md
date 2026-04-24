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
- ORM client: Prisma Client (`prisma-client-js`)

## Active Model Groups
## Tenant and Identity
- `SaasAccount`, `User`, `Session`, `Account`, `Verification`, `EmailTokenLogin`
- `SchoolProfile`, `TenantDomain`, `SchoolSession`, `SessionTerm`
- Planned public website models: `WebsiteTemplateConfig`, `WebsitePublishedConfig`

### TenantDomain (schema: `packages/db/src/schema/school.prisma`)
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (uuid) | PK |
| `subdomain` | String? unique | Slug only — `"daarulhadith"`. Never the full URL. Auto-set on school creation |
| `customDomain` | String? unique | Full user-provided domain — `"myschool.org"`. Nullable |
| `isPrimary` | Boolean | Default true |
| `isVerified` | Boolean | Default false. True for auto-generated subdomains; requires DNS check for custom domains |
| `schoolProfileId` | String? | FK → SchoolProfile |
| `saasAccountId` | String? | FK → SaasAccount (denormalized for fast account-level queries) |

Dashboard URL derived in middleware — never stored: `dashboard.{subdomain}.school-clerk.com`

### Planned WebsiteTemplateConfig (design target for `WEB-002`)
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (uuid) | PK |
| `schoolProfileId` | String | FK → SchoolProfile. Tenant ownership boundary |
| `templateId` | String | Registry template identifier such as `k12-plus-template-1` |
| `name` | String | Tenant-facing draft/published config label |
| `status` | Enum | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `contentJson` | Json | Saved editable field values by stable field key |
| `sectionJson` | Json | Section visibility map by stable section key |
| `themeJson` | Json | Colors, fonts, radius, density, style preset, and other visual config |
| `seoJson` | Json? | Site-wide and page-level SEO overrides |
| `analyticsJson` | Json? | Public tracking/meta settings |
| `templateVersion` | Int | Enables template migration/version compatibility rules |
| `createdByUserId` | String? | Optional author/auditing user link |
| `updatedByUserId` | String? | Optional last editor user link |
| `publishedAt` | DateTime? | Timestamp of the last publish event for this config |
| `createdAt` | DateTime | Audit field |
| `updatedAt` | DateTime | Audit field |

### Planned WebsitePublishedConfig (design target for `WEB-002`)
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (uuid) | PK |
| `schoolProfileId` | String unique | Exactly one published pointer per tenant |
| `websiteConfigId` | String unique | FK → WebsiteTemplateConfig. Active live website config |
| `publishedAt` | DateTime | Publish event timestamp |

### Public Website Persistence Notes
- Website configuration data should be stored in dedicated website tables rather than inflating `SchoolProfile` with large website JSON blobs.
- `WebsiteTemplateConfig` is the durable draft/published document for a tenant website configuration.
- `WebsitePublishedConfig` is the fast lookup pointer used by `apps/school-site` to resolve the live public website.
- `templateVersion` should be captured at save/publish time so future manifest migrations can be deterministic.
- Page content, section visibility, and theme settings are intentionally JSON-backed because template field sets vary by template and page.

## Academic Structure
- `ClassRoom`, `ClassRoomDepartment`, `DepartmentSubject`, `Subject`
- `Students`, `StudentSessionForm`, `StudentTermForm`
- `StaffProfile`, `StaffTermProfile`, `StaffClassroomDepartmentTermProfiles`, `StaffSubject`

### StaffProfile (updated — session 2026-04)
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Placeholder display name is derived from email until onboarding is completed |
| `email` | String? | Required by the current invite-first staff admin flow |
| `inviteStatus` | String? | `NOT_SENT`, `PENDING`, `ACTIVE`, `FAILED` |
| `inviteSentAt` | DateTime? | Latest onboarding email send timestamp |
| `inviteResentAt` | DateTime? | Latest resend timestamp |
| `lastInviteError` | String? | Last delivery failure message for admin follow-up |
| `onboardedAt` | DateTime? | Timestamp set after staff completes password + profile onboarding |

### Staff Assignment Shape (updated — session 2026-04)
- Admin-side staff creation is now invite-first: email + role + teaching assignments.
- Teaching assignments are modeled as repeated classroom entries, each with multiple term-scoped `DepartmentSubject` selections.
- Only teacher-role staff should receive classroom and subject assignment payloads; non-teaching roles persist with empty assignment sets.

## Attendance and Assessment
- `ClassRoomAttendance`, `StudentAttendance`
- `ClassroomSubjectAssessment`, `StudentAssessmentRecord`

## Finance
- `Wallet`, `WalletTransactions`, `StudentWalletTransactions`, `Funds`
- `Fees`, `FeeHistory`, `StudentFee`, `StudentPayment`, `StudentPurchase`
- `Billable`, `BillableHistory`, `Bills`, `BillInvoice`, `BillPayment`

### FeeHistory (updated — session 2025-04)
| Field | Type | Notes |
|-------|------|-------|
| `walletId` | String? | FK → Wallet. Routes payments to the correct accounting stream for this fee |
| `classroomDepartments` | ClassRoomDepartment[] | Implicit M:N via `_ClassRoomDepartmentToFeeHistory`. Empty = applies to all classrooms |

### Concept Clarification (session 2025-04)
- **`Fees` / `FeeHistory`** — Student-facing fees. Supports per-term pricing, accounting stream targeting, and optional classroom scoping. The correct model for anything billed to students (tuition, levies, etc.)
- **`Billable` / `BillableHistory`** — Staff/service-facing charges only. `BillType: SALARY | MISC | OTHER`. Drives `Bills` for payroll and operational expenses. Do NOT use for student fees.

## Other
- `Guardians`, `Activity`, `Posts`
- `AssistantConversation`, `AssistantMessage`, `AssistantRun`, `AssistantToolExecution`, `SchoolAssistantConfig`, `AssistantFeedback`

### Assistant Data Model (session 2026-04)
| Model | Purpose |
|------|---------|
| `AssistantConversation` | Tenant-user scoped conversation shell with title, locale, summary, and last-message timestamp |
| `AssistantMessage` | Durable user/assistant/system messages with stored UI parts and workflow state |
| `AssistantRun` | One assistant request/response cycle with provider, model, prompt summary, usage, and status |
| `AssistantToolExecution` | Per-tool audit row inside a run, including blocked/completed/failed status and mutation flag |
| `SchoolAssistantConfig` | Per-tenant assistant controls for rollout, provider/model selection, allowed roles, enabled/disabled capabilities, analytics, and feedback |
| `AssistantFeedback` | Tenant-user feedback linked to a conversation and/or run |

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
- TODO: document which models are production-active vs transitional legacy.
