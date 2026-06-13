# API Permissions

## Purpose
Defines access control rules for each API surface.

## How To Use
- Update when roles or authorization behavior changes.
- Keep permission mapping by module.
- Include tenant boundary rules.

## Template
## Roles
- Super Admin
- School Admin
- Teacher
- Parent
- Student
- Finance Officer

## Permission Matrix
- Student Management: TBD by role
- Admissions: TBD by role
- Attendance: TBD by role
- Results: TBD by role
- Billing and Payments: TBD by role
- Notifications: TBD by role

## Security Rules
- Role checks happen server-side.
- Tenant membership required for all tenant routes.
- Sensitive actions require audit logging.
- Assistant mutation tools require explicit confirmation before execution.

## Current Dashboard Auth Behavior
- Better Auth trusted origins are resolved per request and include the exact incoming origin for tenant subdomains in development.
- Dashboard login stores tenant-scoped cookie state with school, session, and term identifiers when available.
- Tenant auth cookie reset must tolerate tenants with no school record, no academic sessions, or no terms yet; missing values should not crash login.
- Dashboard host parsing treats `tenant.localhost[:port]`, `tenant.school-clerk-dashboard.localhost:1355`, production tenant subdomains, and verified custom domains as equivalent inputs for tenant resolution.

## Current Dashboard Navigation Authorization
- Dashboard navigation access is currently driven from `apps/dashboard/src/components/sidebar/links.ts`, with the legacy sidebar utility file kept in sync for older consumers.
- Dashboard proxy redirects authenticated requests for `/` and `/login` to the first permitted sidebar link, matching the `gnd` proxy-driven default page pattern.
- Post-login redirect uses that same first permitted sidebar link for the signed-in account.
- The dashboard sidebar root page keeps the same redirect target as a server-side fallback.
- If no permitted dashboard link is found, the app falls back to `/`.
- Teachers now have a dedicated `/teacher` workspace module and authenticated teacher users are redirected there first instead of to mixed admin/academic navigation.
- Teacher workspace routes are grouped under `(k-12-teachers)` and guarded so only Teacher-role users can access them directly.

## Assistant Permission Snapshot (session 2026-04)
- Assistant access is tenant-scoped and tied to the authenticated Better Auth user plus tenant cookie context.
- Tenant admins can update assistant settings through `POST /api/chat/settings`.
- Assistant capability exposure is server-filtered by role and tenant assistant config before tools are made available to the model.
- Current default role access:
  - `students.read`: Admin, Registrar, Teacher, Accountant, Staff
  - `students.enrollment`: Admin, Registrar
  - `finance.read`: Admin, Accountant
  - `finance.write`: Admin, Accountant
  - `inventory.read`: Admin, Accountant, Staff
  - `inventory.write`: Admin, Accountant, Staff
  - `staff.read`: Admin, HR, Teacher
  - `attendance.read`: Admin, Teacher, Registrar
  - `parents.read`: Admin, Registrar, Staff
- If the assistant is disabled, analytics are disabled, feedback is disabled, or a capability is removed in `SchoolAssistantConfig`, the corresponding route/tool is blocked server-side regardless of client state.

## Finance Route Enforcement Status
- Finance tRPC routes now require an authenticated session before execution.
- Finance read routes are enforced server-side for `Admin` and `Accountant` roles.
- Finance write routes are enforced server-side for `Admin` and `Accountant` roles.
- This enforcement now covers streams, payroll, service payments, student payment receipt/reversal, billables, bills, collections, and stream-funding operations.
- Large discretionary finance actions above `NGN 250,000` now require `Admin` role even within finance write access.

## Results and Reports Permissions
- Blank manual classroom report sheet print (`Print Empty Sheet`) is restricted to the `ADMIN` role.
- Filled result sheet printing/exporting remains available to all authorized academic/report users.
