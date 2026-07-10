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

## Enrollment Links And Parent Portal Permissions

- Admin and Registrar can create, update, pause/archive, and copy public enrollment links.
- Admin and Registrar can read, approve, and reject enrollment applications for their tenant.
- Public users can only read/submit through active enrollment link codes and cannot access dashboard tRPC enrollment management routes.
- Parent users can read only wards connected through `Guardians.userId`.
- Parent portal finance, book, uniform, and collection summaries must be read-only in v1.
- Enrollment approval must re-run server-side tenant, classroom, capacity, selected-class age, applicable document, and application-status checks even if the dashboard UI already shows the application as approvable.
- Public admission submissions must enforce selected-class age rules and only require global documents plus documents targeted to the selected classroom.
- Admission/result document template selection must resolve either to a built-in registry template or to a ready custom template request owned by the same tenant.
- Custom template request submission is school-admin facing, but quote/build/status/ready mutations require an env-configured platform template operator role through `SCHOOL_CLERK_TEMPLATE_OPERATOR_ROLES`.

## Security Rules

- Role checks happen server-side.
- Tenant membership required for all tenant routes.
- Sensitive actions require audit logging.
- Assistant mutation tools require explicit confirmation before execution.

## Current Dashboard Auth Behavior

- Better Auth trusted origins are resolved per request and include the exact incoming origin for tenant subdomains in development.
- Dashboard login stores tenant-scoped cookie state with school, session, and term identifiers when available.
- Tenant auth cookie reset must tolerate tenants with no school record, no academic sessions, or no terms yet; missing values should not crash login.
- Dashboard host parsing treats `tenant.localhost[:port]`, `tenant.school-clerk-dashboard.localhost`, `dashboard.{tenant}.school-clerk.com`, production tenant subdomains, and verified custom domains as equivalent inputs for tenant resolution.
- New school owner signup creates a 24-hour email verification token and sends a Resend verification email. The public `/verify-email` tenant route can mark `User.emailVerified = true` without an existing session because possession of the random token is the authorization check.
- Public school-site login and parent enrollment reset links must target the shared dashboard auth system at `dashboard.{tenant}.school-clerk.com` in production.
- Dashboard signout uses tenant-aware URLs in development so path-style LAN sessions such as `10.x.x.x:2200/<tenant>/...` sign out through `/<tenant>/signout` and return to `/<tenant>/login`.
- Development quick login no longer assumes imported users already have the seed `lorem-ipsum` password. In local/dev only, the standalone `/dev-quick-login` route can create a short-lived Better Auth reset token for the selected tenant user, sign in with the dev password, and restore the previous credential hash after session preparation so production-imported passwords remain usable. The visible dev quick-login FAB is login-page only and intentionally only a form filler: it opens with native `details`/`summary` for mobile LAN reliability and fills email, password, and remember-me fields without submitting or preparing the account. The login form also has a server-action POST fallback so insecure LAN/mobile sessions that do not hydrate React still submit through Better Auth instead of leaking credentials through a native GET request.

## Current Dashboard Navigation Authorization

- Dashboard navigation access is currently driven from `apps/dashboard/src/components/sidebar/links.ts`, with the legacy sidebar utility file kept in sync for older consumers.
- Dashboard proxy redirects authenticated requests for `/` and `/login` to the first permitted sidebar link, matching the `gnd` proxy-driven default page pattern.
- Post-login redirect uses that same first permitted sidebar link for the signed-in account.
- The dashboard sidebar root page keeps the same redirect target as a server-side fallback.
- If no permitted dashboard link is found, the app falls back to `/`.
- Teachers now have a dedicated `/teacher` workspace module and authenticated teacher users are redirected there first instead of to mixed admin/academic navigation.
- Teacher workspace routes are grouped under `(k-12-teachers)` and guarded so only Teacher-role users can access them directly.
- Teacher sidebar navigation currently renders as a flat list of permitted links while non-teacher roles keep the module-grouped sidebar.

## Teacher/Classroom Authorization Status

- The data model has teacher-to-classroom and teacher-to-subject assignment tables via `StaffClassroomDepartmentTermProfiles` and `StaffSubject`.
- The dashboard now lets admins assign allowed classrooms and allowed subjects per staff member from the staff invite/edit sheets.
- Assigned classroom permissions are stored against the active `StaffTermProfile`, and each classroom assignment has `subjectAccessMode = SELECTED | ALL`.
- `SELECTED` subject permissions are stored against active-term `DepartmentSubject` records through `StaffSubject`.
- `ALL` classroom assignments authorize every current and future active-term subject in the assigned classroom without requiring new `StaffSubject` rows.
- Teacher workspace summaries now consume explicit subject assignments plus `ALL` classroom assignments to scope visible classes, students, subjects, and attendance history for the signed-in teacher.
- Full server-side authorization for downstream assessment/report mutation surfaces still needs to be layered on as those teacher workflows mature.

## Staff Role and Onboarding Rules

- The admin staff form is invite-first: admins only enter the staff email, role, and teaching assignments.
- Classroom and subject assignment should remain teacher-only for now; non-teaching roles persist with empty assignment sets even if the client tries to submit classroom data.
- Pending onboarding is a first-class staff-management state and supports resend plus copyable share links from the staff directory.
- Staff complete their profile details on the onboarding/reset-password screen after setting their password.

## Staff Invite Status

- Staff save now sends onboarding automatically when needed instead of relying on an explicit "Send onboarding email" toggle.
- Invites create or update the tenant user record, create a 24-hour Better Auth-compatible reset token, and send the shared staff invitation email with a staff-scoped onboarding link so the staff member can set a password and fill their own profile details.
- Copying an onboarding link creates a fresh 24-hour reset-password verification token directly and returns a staff-scoped onboarding URL without using email delivery or revoking other active reset tokens.
- The reset-password/onboarding page checks token status before submitting to Better Auth so expired links are identified as expired, while invalid or already-used links remain blocked.

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
- Large discretionary finance actions above `NGN 250,000` now require `Admin` role even within finance write access.

## Results and Reports Permissions

- Blank manual classroom report sheet print (`Print Empty Sheet`) is restricted to `ADMIN` SaaS owners and `Admin` staff admins.
- Filled result sheet printing/exporting remains available to all authorized academic/report users.
- The assessment-recording setup state may show an `Open classroom overview` CTA only to `ADMIN` SaaS owners and title-case `Admin` staff admins; assigned staff/teacher users can still use their scoped recording filters but do not see this classroom-management entry point.
- Admin users can generate approved public assessment-recording links directly from the current assessment-recording filters, choose an expiry duration, copy the one-time URL, revoke active links, and approve/reject staff requests.
- Non-admin staff with authorized classroom/subject scope can request a public assessment-recording link and must provide a reason. The request remains `PENDING` until an admin approves it.
- Public assessment link request email CTAs for admins must resolve to the tenant dashboard host, `dashboard.{tenant}.school-clerk.com` in production.
- Public assessment-recording token users do not authenticate through dashboard auth. Their access is limited to the stored tenant, term, classroom, subject filter, optional student filter, expiry time, and link status.
- Public score entry must enforce the same score safety rules as authenticated entry: scoreable assessments only, no grouped parent score writes, and obtained scores within the assessment maximum.

## Website Management Permissions

- Dashboard website management server actions require tenant cookie context plus `ADMIN` or `Admin` user role.
- Create, save, CMS save, publish, duplicate, archive, media import, media upload, and field-AI generation all re-check permissions server-side.
- Template create/save/publish paths also verify the template is available for the resolved school institution type and configured website plan.
- Published website configs are immutable. Admins must duplicate the live config before editing content, theme, sections, SEO, or CMS blocks.
- Public `apps/school-site` visitors can only render the active `WebsitePublishedConfig` pointer. Preview rendering requires a signed preview token, and public `?template=` demo rendering is disabled in production unless explicitly enabled by environment.
