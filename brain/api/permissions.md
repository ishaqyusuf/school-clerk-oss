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

## Current Dashboard Auth Behavior
- Better Auth trusted origins are resolved per request and include the exact incoming origin for tenant subdomains in development.
- Dashboard login stores tenant-scoped cookie state with school, session, and term identifiers when available.
- Tenant auth cookie reset must tolerate tenants with no school record, no academic sessions, or no terms yet; missing values should not crash login.

## Current Dashboard Navigation Authorization
- Dashboard navigation access is currently driven from `apps/dashboard/src/sidebar/utils.ts`.
- Dashboard proxy redirects authenticated requests for `/` and `/login` to the first permitted sidebar link, matching the `gnd` proxy-driven default page pattern.
- Post-login redirect uses that same first permitted sidebar link for the signed-in account.
- The dashboard sidebar root page keeps the same redirect target as a server-side fallback.
- If no permitted dashboard link is found, the app falls back to `/`.
