# Enrollment Links And Parent Portal

## Status
In Progress

## Goal
Allow school admins to generate public enrollment links for specific classrooms, collect parent-submitted student applications with required document uploads, review applications before enrollment, and give parents a login portal for ward status and school-related collections.

## Users
- Admin and Registrar: create enrollment links, define capacity, review applications, approve or reject submissions.
- Parent: submit student enrollment information, upload required documents, set up login, and view wards after authentication.

## Flow
1. Admin creates an enrollment link from `/students/enrollment`.
2. Admin selects available classroom departments, capacity mode, maximum enrollment, required documents, and instructions.
3. Parent opens the generated public school-site link.
4. Parent selects a classroom, enters student details, enters parent/guardian details, marks the primary parent, and uploads required documents.
5. Submission creates a pending enrollment application.
6. Success UI tells existing onboarded parents they can log in, or shows `Setup parent password` for new/unonboarded parents.
7. Staff review the application and approve or reject it.
8. Approval creates or links the parent, guardian, student, session form, term form, fee charges, and parent portal access.

## Data Model
- `EnrollmentLink`: tenant-owned public enrollment campaign/link.
- `EnrollmentLinkClassroom`: classrooms available through the link, with optional per-classroom capacity.
- `EnrollmentLinkDocumentRequirement`: required document labels and upload rules.
- `EnrollmentApplication`: submitted student enrollment request and review status.
- `EnrollmentApplicationParent`: parent/guardian details, primary flag, and linked user/guardian.
- `EnrollmentApplicationDocument`: uploaded document metadata and review status.
- `Guardians.userId`: nullable bridge to authenticated parent users.

## APIs
- Admin tRPC: list/create/update links, list applications, approve, reject.
- Public school-site handlers: read link, submit application, upload documents, set up parent password.
- Parent tRPC: authenticated overview of wards, enrollment status, fees, collection status, books, uniforms, and relevant parent features.

## Current Implementation Notes
- Prisma schema and migration draft exist for enrollment links, applications, submitted parents, uploaded documents, and `Guardians.userId`.
- `trpc.enrollmentLinks.*` owns authenticated Admin/Registrar link management and application review.
- `trpc.parents.overview` owns authenticated Parent ward/status reads through linked guardians.
- `apps/school-site/src/app/enroll/[code]/page.tsx` owns the public parent submission and success flow.
- `apps/dashboard/src/app/[domain]/(sidebar)/students/enrollment/page.tsx` now hosts the enrollment link/application management surface.
- `apps/dashboard/src/app/[domain]/(sidebar)/parents/page.tsx` now hosts the first parent portal overview.

## UI/UX Notes
- Public link opens on the school-site surface, not behind dashboard auth.
- Parent form should feel school-branded and mobile-first.
- Capacity should be shown clearly when a classroom is full.
- Success state should explain whether the parent can log in now or needs to set a password.
- Parent portal starts with a useful overview before deeper pages are fully built.

## Permissions
- Admin and Registrar can manage links and applications.
- Public users can only submit through valid active enrollment tokens.
- Parent users can only view wards connected through their linked guardian record.
- Approval must revalidate tenant, classroom, active session/term, capacity, and document requirements.

## Edge Cases
- Link is inactive, expired, or full.
- Classroom reaches capacity after the parent loads the form.
- Required document upload fails or has unsupported type.
- Parent already exists and is onboarded.
- Parent exists but has no password yet.
- Duplicate student names or duplicate parent phones.
- Application is approved twice or rejected after approval.

## Metrics
- Active enrollment links.
- Submitted applications by link/classroom.
- Approval, rejection, and pending counts.
- Document completion rate.
- Parent password setup completion.
- Parent portal login rate.

## Open Questions
- Whether rejected applications should be editable/resubmittable by parents.
- Whether schools need custom per-link form fields beyond the initial student/parent/document fields.
- Whether document review needs per-file approval in v1 or only whole-application approval.
