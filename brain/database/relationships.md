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
- `SchoolProfile` 1:N `WebsiteTemplateConfig` (planned public website draft/archive history)
- `SchoolProfile` 1:1 `WebsitePublishedConfig` (planned pointer to active live website)
- `TenantDomain` stores `subdomain` (slug) + optional `customDomain` (full domain)
- `WebsitePublishedConfig` 1:1 `WebsiteTemplateConfig` (planned active published configuration)
- `SchoolProfile` 1:N `Students`, `StaffProfile`, `Guardians`, `ClassRoom`, `Activity`, `Fees`, `Billable`, `Wallet`
- `SchoolSession` 1:N `SessionTerm`, `ClassRoom`, `StudentSessionForm`, `StudentTermForm`
- `ClassRoom` 1:N `ClassRoomDepartment`
- `ClassRoomDepartment` 1:N `DepartmentSubject`, `StudentSessionForm`, `StudentTermForm`, `StudentAttendance`
- `Students` 1:N `StudentSessionForm`, `StudentTermForm`, `StudentFee`, `StudentAssessmentRecord`, `StudentWalletTransactions`
- `Students` N:M `Guardians` via `StudentGuardians`
- `StudentTermForm` 1:N `StudentAttendance`, `StudentFee`, `StudentPayment`, `StudentAssessmentRecord`
- `Wallet` 1:N `WalletTransactions`; `WalletTransactions` links to `StudentPayment` and `BillPayment`
- `Wallet` 1:N `FeeHistory` (via `walletId` — accounting stream for student fees)
- `Wallet` 1:N `BillableHistory` (via `walletId` — accounting stream for staff/service billables)
- `FeeHistory` N:M `ClassRoomDepartment` via implicit join `_ClassRoomDepartmentToFeeHistory` (empty = all classes)
- `BillableHistory` N:M `ClassRoomDepartment` via implicit join `_BillableHistoryToClassRoomDepartment` (empty = all classes)
- `BillInvoice` 1:1 `BillPayment`; `Bills` may link to `BillInvoice`, `BillPayment`, `Billable`, `Wallet`

## Integrity Rules
- Most domain entities must be tenant-scoped through `schoolProfileId` or session/school ancestry.
- Cross-tenant references should be prohibited at service/repository level.
- Planned website publish invariant: a tenant can own many website configs, but exactly zero or one config may be live at a time through `WebsitePublishedConfig`.
- Planned website publish transaction: publishing must update config status, published timestamp, and published pointer atomically.
- Planned website ownership invariant: `WebsitePublishedConfig.websiteConfigId` must always reference a `WebsiteTemplateConfig` owned by the same `schoolProfileId`.
- Legacy models (`school`, `guardian`, `session_class`) use separate relation chains and need consolidation rules.
- TODO: add DB-level indexes/constraints audit for tenant scoping fields.
