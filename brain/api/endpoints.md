# API Endpoints

## Purpose

Catalog of API routes and responsibilities.

## How To Use

- Update when endpoints are added, removed, or changed.
- Keep route ownership and tenant scope explicit.
- Link contracts and permissions docs.

## Template

## Domain Endpoints

### Student Management

- `GET /students`
- `POST /students`
- `GET /students/:id`
- `PATCH /students/:id`
- `trpc.students.overview` (tenant-scoped student overview payload with active term options, identity fields, and first guardian for overview/page hosts)
- `trpc.students.updateStudentBasicProfile` (tenant-scoped mutation for names, gender, DOB, and first parent/guardian details)
- `trpc.students.getImportNameGuide` (tenant-scoped existing name-part guide for student import parsing)
- `trpc.students.verifyStudentImport` (batch verify student import rows for duplicates, typos, gender inference, and row-level classroom assignment)

### Admissions

- `GET /admissions`
- `POST /admissions`
- `trpc.enrollmentLinks.listLinks`
- `trpc.enrollmentLinks.createOrUpdateLink`
- `trpc.enrollmentLinks.setLinkStatus`
- `trpc.enrollmentLinks.getApplications`
- `trpc.enrollmentLinks.approveApplication`
- `trpc.enrollmentLinks.rejectApplication`
- `school-site /enroll/[code]` public enrollment form and submission handlers with selected-class age rules, typed document requirement filtering, upload validation, parent email confirmation, and parent password setup
- `dashboard /settings/document-templates` server-action surface for result template preferences, custom template uploads, quote/build status tracking, and validated ready custom JSON templates

### Public School Website

- `school-site /login` public tenant-aware redirect to the resolved tenant's shared dashboard login. Website templates link here for sign-in; auth UI and dashboard routing are not template-owned.
- `school-site /[[...slug]]` public catch-all renderer for the active published website config. It uses manifest-driven routes, merges eligible `showOnWebsite=true` admission links into template content data, and returns not found for unresolved tenants, missing published configs in production, unsupported paths, and missing detail slugs.
- `school-site /robots.txt` public metadata route for resolved school websites.
- `school-site /sitemap.xml` public metadata route generated from template manifest routes plus config-backed blog/event/resource collections.
- `dashboard /settings/website` tenant admin website builder for draft creation, live preview, saving, publishing, duplicating, archiving, CMS management entry, and media management entry.

### Parent Portal

- `trpc.parents.overview`

### Attendance

- `GET /attendance`
- `POST /attendance`

### Exams and Results

- `GET /results`
- `POST /results`
- `trpc.assessments.listPublicAssessmentLinks`
- `trpc.assessments.createPublicAssessmentLink`
- `trpc.assessments.requestPublicAssessmentLink`
- `trpc.assessments.approvePublicAssessmentLink`
- `trpc.assessments.rejectPublicAssessmentLink`
- `trpc.assessments.revokePublicAssessmentLink`
- `trpc.assessments.getPublicAssessmentLink` (public token route)
- `trpc.assessments.updatePublicAssessmentScore` (public token route)
- `dashboard /assessment-recording/public/[token]` public result-entry page for approved, unexpired assessment links

### External Examinations

- `GET /external-exam-bodies`
- `POST /external-exam-bodies`
- `GET /external-exams`
- `POST /external-exams`
- `POST /external-exams/:examId/candidates`
- `POST /external-exams/:examId/candidates/bulk`
- `PATCH /external-exams/:examId/candidates/:candidateId/status`
- `POST /external-exams/:examId/candidates/:candidateId/subjects`
- `POST /external-exams/:examId/candidates/:candidateId/payment`
- `POST /external-exams/:examId/candidates/:candidateId/submit`
- `POST /external-exams/:examId/results`
- `GET /external-exams/:examId/analytics`
- `GET /external-exams/:examId/exports/candidates`

### Billing and Payments

- `GET /invoices`
- `POST /invoices`
- `POST /payments`
- `trpc.finance.getStreams`
- `trpc.finance.getStreamDetails`
- `trpc.finance.transferFunds`
- `trpc.finance.getServicePayments`
- `trpc.finance.repayBillOwing`
- `trpc.finance.payServiceBill`
- `trpc.finance.cancelServiceBillPayment`
- `trpc.finance.getPayroll`
- `trpc.finance.payStaffBill`
- `trpc.finance.cancelStaffBillPayment`
- `trpc.finance.getFinanceIntegrityReport`
- `trpc.finance.getFinanceReports`
- `trpc.finance.generateBillsFromBillables`
- `trpc.finance.backfillBillSettlements`
- `trpc.finance.receiveStudentPayment`
- `trpc.finance.reverseStudentPayment`

### Notifications

- `trpc.notifications.list`
- `trpc.notifications.unreadCount`
- `trpc.notifications.markRead`
- `trpc.notifications.markAllRead`

### Global Search

- `trpc.search.global`

### Staff Management

- `trpc.staff.getStaffList`
- `trpc.staff.getFormData`
- `trpc.staff.createStaff`
- `trpc.staff.deleteStaff`
- `action.saveStaffAction`
- `action.resendStaffOnboardingAction`
- `action.completeStaffOnboardingAction`

### PDF Output

- `GET /api/pdf/student-payment-receipt`
- `GET /api/pdf/result` dashboard result PDF route with tenant template preference resolution and ready custom JSON result-template rendering
- `school-site GET /api/pdf/admission-letter` public approved-application PDF route with stored approval template fallback and ready custom JSON admission-letter rendering

### AI Chat

- `POST /api/chat`
- `GET /api/chat/conversations`
- `POST /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId`
- `POST /api/chat/conversations/:conversationId/messages`
- `GET /api/chat/settings`
- `POST /api/chat/settings`
- `GET /api/chat/analytics`
- `POST /api/chat/feedback`

## Router Ownership Map

- `trpc.students.*`: student listing, detail, overview, student-centric workflows, focused basic-profile edits, and **student import** (`createStudent`, `updateStudentBasicProfile`, `getImportNameGuide`, `executeStudentImport`)
- `trpc.classrooms.*`: classroom lists, overview, and classroom-scoped actions
- `trpc.academics.*`: academic session, term, enrollment, and promotion flows (includes `entrollStudentToTerm` used during import workflow)
- `trpc.transactions.*`: fee definitions, fee imports, and other transaction-oriented finance writes
- `trpc.finance.*`: streams, bills, payroll, receive-payment, and finance reporting workflows (includes fee-application logic triggered by import term-sheet creation)
- `trpc.attendance.*`: classroom attendance capture and student attendance history
- `trpc.staff.*`: staff list/form data and staff-management APIs
- `trpc.notifications.*`: notification list/read/count actions
- `trpc.search.global`: tenant-scoped command palette search across local navigation plus remote student, classroom, and staff records
- `trpc.subjects.*`, `trpc.enrollments.*`, `trpc.assessments.*`, `trpc.filters.*`, `trpc.auth.*`: domain-specific supporting routers. `trpc.assessments.*` owns authenticated assessment setup/recording plus public assessment-recording link lifecycle and token-scoped score entry.
- `trpc.enrollmentLinks.*`: authenticated Admin/Registrar management for public enrollment links and pending applications
- `trpc.parents.*`: authenticated Parent overview data scoped through linked guardian records
- `app/api/chat/*`: dashboard AI chat execution, single-chat bootstrap, settings, analytics, and feedback surfaces

### Student Import

- `trpc.students.getImportNameGuide`: compact query returning unique tenant-scoped existing student name parts from `name`, `surname`, and `otherName` for guided import parsing.
- `trpc.students.executeStudentImport`: batch mutation applying import-new, keep-match, and update-match-with-name actions. Creates students and term sheets idempotently, validates each row's classroom/session ancestry, applies fee histories.
