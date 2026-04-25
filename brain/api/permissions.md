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

## Teacher/Classroom Authorization Status
- The data model has teacher-to-classroom and teacher-to-subject assignment tables via `StaffClassroomDepartmentTermProfiles` and `StaffSubject`.
- The dashboard now lets admins assign allowed classrooms and allowed subjects per staff member from the staff invite/edit sheets.
- Assigned classroom permissions are stored against the active `StaffTermProfile`, and subject permissions are stored against active-term `DepartmentSubject` records.
- Teacher workspace summaries now consume those assignments to scope visible classes, students, subjects, and attendance history for the signed-in teacher.
- Full server-side authorization for downstream assessment/report mutation surfaces still needs to be layered on as those teacher workflows mature.

## Staff Role and Onboarding Rules
- The admin staff form is invite-first: admins only enter the staff email, role, and teaching assignments.
- Classroom and subject assignment should remain teacher-only for now; non-teaching roles persist with empty assignment sets even if the client tries to submit classroom data.
- Pending onboarding is a first-class staff-management state and supports resend from the staff directory.
- Staff complete their profile details on the onboarding/reset-password screen after setting their password.

## Staff Invite Status
- Staff save now sends onboarding automatically when needed instead of relying on an explicit "Send onboarding email" toggle.
- Invites create or update the tenant user record and trigger Better Auth's reset-password flow with a staff-scoped onboarding link so the staff member can set a password and fill their own profile details.

## Staff Management Navigation Split
- `/staff/teachers` remains the admin teacher-management page.
- `/staff/non-teaching`, `/staff/departments`, and `/staff/attendance` are now basic tenant-scoped admin/HR overview pages.
- Broad teacher access was removed from the Academic sidebar module; teacher day-to-day navigation now lives in the dedicated teacher workspace instead.

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
