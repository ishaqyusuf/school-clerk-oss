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
- `SchoolProfile` 1:N `Students`, `StaffProfile`, `Guardians`, `ClassRoom`, `Activity`, `Fees`, `Billable`, `Wallet`
- `SchoolSession` 1:N `SessionTerm`, `ClassRoom`, `StudentSessionForm`, `StudentTermForm`
- `ClassRoom` 1:N `ClassRoomDepartment`
- `ClassRoomDepartment` 1:N `DepartmentSubject`, `StudentSessionForm`, `StudentTermForm`, `StudentAttendance`
- `Students` 1:N `StudentSessionForm`, `StudentTermForm`, `StudentFee`, `StudentAssessmentRecord`, `StudentWalletTransactions`
- `Students` N:M `Guardians` via `StudentGuardians`
- `StudentTermForm` 1:N `StudentAttendance`, `StudentFee`, `StudentPayment`, `StudentAssessmentRecord`
- `Wallet` 1:N `WalletTransactions`; `WalletTransactions` links to `StudentPayment` and `BillPayment`
- `BillInvoice` 1:1 `BillPayment`; `Bills` may link to `BillInvoice`, `BillPayment`, `Billable`, `Wallet`

## Integrity Rules
- Most domain entities must be tenant-scoped through `schoolProfileId` or session/school ancestry.
- Cross-tenant references should be prohibited at service/repository level.
- Legacy models (`school`, `guardian`, `session_class`) use separate relation chains and need consolidation rules.
- TODO: add DB-level indexes/constraints audit for tenant scoping fields.
