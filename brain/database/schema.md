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

## Legacy/Parallel Models Detected
- `schema.prisma` also contains lowercase legacy models: `school`, `guardian`, `session_class`.
- These coexist with PascalCase domain models and should be consolidated to one canonical set.

## Schema Notes
- Tenant key strategy in active models: `schoolProfileId` is widely used for tenant scoping.
- Soft delete pattern: most models use nullable `deletedAt`; legacy models use `deleted_at`.
- Auditing fields: `createdAt` and `updatedAt` present across most active models.
- TODO: document which models are production-active vs transitional legacy.
