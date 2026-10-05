# Enrollment Links And Parent Portal

## Status
In Progress

## Goal
Allow school admins to generate public enrollment links for specific classrooms, collect parent-submitted student applications with required document uploads, review applications before enrollment, and give parents a login portal for ward status and school-related collections.

## Users
- Admin and Registrar: create enrollment links, define capacity, review applications, approve with admission payment details, or reject submissions.
- Parent: submit student enrollment information, upload required documents, set up login, and view wards after authentication.

## Flow
1. Admin creates an enrollment link from `/students/enrollment`.
2. Admin selects available classroom departments, website visibility, capacity mode, maximum enrollment, class-specific age rules/notes, required documents, and instructions.
3. Parent opens the generated public school-site link.
4. Parent selects a classroom, sees that class's age/document requirements, enters student details, enters parent/guardian details, marks the primary parent, and uploads the applicable required documents.
5. Submission validates selected-class requirements, stores typed uploaded documents, creates a pending enrollment application, and sends a submission confirmation email to the primary parent.
6. Success UI offers an email setup link sent only to the recorded primary parent. The private, expiring link verifies email ownership before creating/linking a Parent login; existing passwords remain unchanged. New logins use email, not the application's unverified phone number.
7. Staff review the application and approve with optional/required admission payment details, or reject it.
8. Approval creates or links the parent, guardian, student, session form, term form, fee charges, parent portal access, stores payment handoff and selected admission-letter template metadata, and sends the successful-admission email with the payment details and admission-letter PDF link.
9. Schools can manage document templates from `/settings/document-templates`, including choosing a default result template and requesting custom admission/result/form templates from uploaded PDFs or scans. Platform template operators can quote those requests with amount, currency, due date, instructions, and an optional external payment link before marking them paid/in-build/ready.

## Data Model
- `EnrollmentLink`: tenant-owned public enrollment campaign/link with `showOnWebsite` for public website display versus manual-only sharing.
- `EnrollmentLinkClassroom`: classrooms available through the link, with optional per-classroom capacity, age range, cutoff date, and requirement notes.
- `EnrollmentLinkDocumentRequirement`: required document labels, document type, and upload rules that may apply globally or to one selected classroom.
- `EnrollmentApplication`: submitted student enrollment request, review status, accepted student/term links, approval payment metadata, selected admission-letter PDF template metadata, and approval-email sent timestamp.
- `EnrollmentApplicationParent`: parent/guardian details, primary flag, and linked user/guardian.
- `EnrollmentApplicationDocument`: uploaded document metadata, document type, storage metadata, and review status.
- `SchoolDocumentTemplatePreference`: tenant default document-template choice, currently used by result-sheet PDF generation.
- `CustomDocumentTemplateRequest`: uploaded custom template build request with quote payment handoff metadata, quote/build status, and validated JSON template metadata when ready.
- `Guardians.userId`: nullable bridge to authenticated parent users.

## APIs
- Admin tRPC: list/create/update links, list applications, approve, reject.
- Public school-site handlers: read link, submit application, upload documents, request parent setup email, confirm the one-use email setup capability.
- Parent tRPC: authenticated overview of wards, enrollment status, fees, collection status, books, uniforms, and relevant parent features.

## Current Implementation Notes
- 2026-09-07, implemented but untested: Admissions gates public page/submission/uploads/letters/listings; parent setup also requires Parent Portal. `parent-setup-actions.ts` composes the auth package's email-proof workflow; scoped identity/guardian writes live in `packages/db/src/enrollment-parent-access.ts`. See [ADR-0024](../decisions/ADR-0024-enrollment-parent-email-proof.md). The former direct reset-token action has been removed.
- Prisma schema and migration draft exist for enrollment links, applications, submitted parents, uploaded documents, and `Guardians.userId`.
- `trpc.enrollmentLinks.*` owns authenticated Admin/Registrar link management and application review.
- `trpc.parents.overview` owns authenticated Parent ward/status reads through linked guardians.
- `apps/school-site/src/app/enroll/[code]/page.tsx` owns the public parent submission and success flow.
- `apps/school-site/src/lib/enrollment/actions.ts` validates parent email/phone/date-of-birth, selected-class document uploads, passport-photo image types, surfaces readable Vercel Blob configuration errors, and dispatches the submission-success email through Resend when configured. Parent-facing admission emails use the school name as the sender display name and subject prefix when available.
- `apps/school-site/src/lib/website/get-public-website-data.ts` resolves active, open, not-full `showOnWebsite=true` enrollment links for public school website templates.
- `apps/api/src/db/queries/enrollment-links.ts` revalidates class requirements during approval, stores admission payment handoff metadata, applies fee histories, and sends the successful-admission email through Resend when configured. Parent-facing admission emails use the school name as the sender display name and subject prefix when available. Real Resend API delivery has been smoke-tested successfully.
- `packages/pdf/src/documents` owns the shared document template registry for admission letters and result sheets.
- `packages/pdf/src/admission-letter` owns code-backed admission-letter templates; `packages/pdf/src/json-template` owns the constrained JSON schema, preview renderer, and PDF renderer for simpler/custom documents.
- `apps/school-site/src/app/api/pdf/admission-letter/route.ts` renders approved parent-facing admission-letter PDFs when given the enrollment link code and application ID; it falls back to the stored approval template and supports ready custom JSON admission-letter templates.
- `apps/dashboard/src/app/[domain]/(sidebar)/settings/document-templates/page.tsx` lets schools choose result templates, request custom builds, view quote payment handoff details, attach validated built-template JSON, and select ready custom result templates.
- `apps/dashboard/src/app/[domain]/(sidebar)/students/enrollment/page.tsx` now hosts the enrollment link/application management surface.
- `apps/dashboard/src/app/[domain]/(sidebar)/parents/page.tsx` now hosts the first parent portal overview.
- `packages/template-registry` exposes admission-link content data and reusable admission CTA/list rendering for school website home/admissions pages.

## UI/UX Notes
- Public link opens on the school-site surface, not behind dashboard auth.
- `showOnWebsite=true` links can appear on published school website admission sections; `showOnWebsite=false` links remain manual/direct-share only.
- Parent form should feel school-branded and mobile-first.
- Primary parent email is required because the submission confirmation is sent after successful application creation.
- Approval requires payment amount plus instructions or a payment link when the admin marks admission payment as required.
- Approval captures the admission-letter template to use in the parent email; approved dashboard cards can open or download built-in, JSON-backed, or ready custom admission-letter templates.
- Result PDFs use the tenant's saved result-template preference unless a query override is supplied.
- Custom template quote payment uses dashboard-visible instructions and optional external payment links; native checkout-provider collection is not yet selected.
- Capacity should be shown clearly when a classroom is full.
- Success state requests email verification without exposing existing account/password status. Confirmation explains whether a new password was initialized or the existing password was retained; no automatic login occurs. Request/confirmation controls stack on narrow screens with 44px targets and pending/error states; mobile/browser verification is deferred.
- Parent portal starts with a useful overview before deeper pages are fully built.

## Permissions
- Admin and Registrar can manage links and applications.
- Public users submit through active enrollment codes; an application ID/code pair is not a signed identity token. Login linking additionally requires the emailed, single-use capability, bound to the recorded primary parent, application, school/account and email.
- Parent setup rejects inactive/deleted links, withdrawn/rejected applications, changed identity scope and unavailable required modules. It never returns a password-reset token to a public caller or selects an account by application phone. Existing active account matches must be unambiguous, same-account and Parent-role. Conflicting guardian ownership or other existing wards require staff review.
- Approval uses only an explicit verified parent-login link, not a phone/email match. Historical links from the former flow still need audit; no automatic cleanup/reassignment has been performed.
- Parent users can only view wards connected through their linked guardian record.
- Admission upload links are only exposed to authenticated admin/registrar review surfaces; current Vercel Blob storage uses public, unguessable blob URLs because no private blob proxy exists yet.
- Live admission/template upload validation requires a valid `BLOB_READ_WRITE_TOKEN`; live Blob upload/delete smoke validation now passes against the provisioned `school-clerk-admissions` Vercel Blob store. `schoolify` is configured for Production and Development Blob access; preview branches still need branch-specific Blob env if used.
- Approval must revalidate tenant, classroom, active session/term, capacity, age rules, selected-class document requirements, and required payment handoff details.
- Admission-letter approval must validate that the selected template is either built in or a ready custom template owned by the same school.
- Custom template request submission is school-admin facing, while quote/build/status/ready mutations require an env-configured platform template operator role.

## Edge Cases
- Link is inactive, expired, or full.
- Classroom reaches capacity after the parent loads the form.
- Required document upload fails, has unsupported type, or only applies to a different selected class.
- Student date of birth does not satisfy the selected class age requirement.
- Parent already exists and is onboarded.
- Parent exists but has no password yet.
- Duplicate student names or duplicate parent phones.
- Application is approved twice or rejected after approval.
- Custom template request is marked ready without matching/valid JSON.
- Custom template request is quoted with a positive amount but no payment instructions or payment link.
- Saved result-template preference points to a custom template that is later removed or invalidated.

## Metrics
- Active enrollment links.
- Submitted applications by link/classroom.
- Approval, rejection, and pending counts.
- Document completion rate.
- Parent password setup completion.
- Parent portal login rate.
- Template request conversion rate and custom-template ready time.

## Open Questions
- Whether rejected applications should be editable/resubmittable by parents.
- Whether schools need custom per-link form fields beyond the initial student/parent/document fields.
- Whether document review needs per-file approval in v1 or only whole-application approval.
- Whether custom template quote/payment should connect to the product billing provider in v1 or remain an offline/manual payment process.
