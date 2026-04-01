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
- Dashboard host parsing treats `tenant.localhost[:port]`, `tenant.school-clerk-dashboard.localhost:1355`, production tenant subdomains, and verified custom domains as equivalent inputs for tenant resolution.

## Current Dashboard Navigation Authorization
- Dashboard navigation access is currently driven from `apps/dashboard/src/components/sidebar/links.ts`, with the legacy sidebar utility file kept in sync for older consumers.
- Dashboard proxy redirects authenticated requests for `/` and `/login` to the first permitted sidebar link, matching the `gnd` proxy-driven default page pattern.
- Post-login redirect uses that same first permitted sidebar link for the signed-in account.
- The dashboard sidebar root page keeps the same redirect target as a server-side fallback.
- If no permitted dashboard link is found, the app falls back to `/`.
- Teachers now have a dedicated `/teacher` workspace module and authenticated teacher users are redirected there first instead of to mixed admin/academic navigation.
- Teacher workspace routes are grouped under `(k-12-teachers)` and guarded so only Teacher-role users can access them directly.

## Teacher/Classroom Authorization Status
- The data model has teacher-to-classroom and teacher-to-subject assignment tables via `StaffClassroomDepartmentTermProfiles` and `StaffSubject`.
- The dashboard now lets admins assign allowed classrooms and allowed subjects per staff member from the teachers create/edit sheets.
- Assigned classroom permissions are stored against the active `StaffTermProfile`, and subject permissions are stored against active-term `DepartmentSubject` records.
- Teacher workspace summaries now consume those assignments to scope visible classes, students, subjects, and attendance history for the signed-in teacher.
- Full server-side authorization for downstream assessment/report mutation surfaces still needs to be layered on as those teacher workflows mature.

## Staff Invite Status
- Staff create/edit now supports role assignment plus a "Send onboarding email" option.
- Invites create or update the tenant user record and trigger Better Auth's reset-password flow so the staff member receives a link to set their password.

## Staff Management Navigation Split
- `/staff/teachers` remains the admin teacher-management page.
- `/staff/non-teaching`, `/staff/departments`, and `/staff/attendance` are now basic tenant-scoped admin/HR overview pages.
- Broad teacher access was removed from the Academic sidebar module; teacher day-to-day navigation now lives in the dedicated teacher workspace instead.
