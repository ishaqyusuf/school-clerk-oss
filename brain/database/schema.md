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

## Attendance and Assessment
- `ClassRoomAttendance`, `StudentAttendance`
- `ClassroomSubjectAssessment`, `StudentAssessmentRecord`

## Finance
- `Wallet`, `WalletTransactions`, `StudentWalletTransactions`, `Funds`
- `Fees`, `FeeHistory`, `StudentFee`, `StudentPayment`, `StudentPurchase`
- `Billable`, `BillableHistory`, `Bills`, `BillInvoice`, `BillPayment`

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
