# API Contracts

## Purpose

Defines request/response contracts, validation rules, and versioning expectations.

## How To Use

- Update when payload shape or status behavior changes.
- Record breaking vs non-breaking changes.
- Keep examples short and representative.

## Template

## Contract Rules

- Every route validates input schema.
- Responses include consistent error envelope.
- Tenant context is required for tenant-scoped routes.

## Academic Data Direction Contracts

- Route: `schoolSettings.getAcademicDataDirection`
- Request schema: none
- Response schema: `{ mode: "AUTO" | "LTR" | "RTL", direction: "ltr" | "rtl", analyzedRecords: number, ltrWeight: number, rtlWeight: number, sources }`, where `sources` contains bounded analyzed/LTR/RTL counts for students, classrooms, departments, subjects, school, and language.
- Error cases: unauthenticated request; missing tenant context. Detector/database failures return a safe LTR fallback rather than failing the dashboard layout.
- Notes: the school id is derived exclusively from authenticated tenant context. Automatic analysis uses bounded tenant-scoped samples and a five-minute server cache. Missing/tied evidence resolves to LTR.

- Route: `schoolSettings.updateAcademicDataDirection`
- Request schema: `{ mode: "AUTO" | "LTR" | "RTL" }`
- Response schema: `{ mode: "AUTO" | "LTR" | "RTL" }`
- Error cases: unauthenticated request, non-administrator role, missing tenant context, school not found in the active tenant.
- Notes: the mutation never accepts a school id and constrains the update to the authenticated `schoolProfileId`. Forced LTR/RTL mode is read without the automatic-analysis cache.

## Endpoint Contract Template

- Route:
- Request schema:
- Response schema:
- Error cases:
- Notes:

## Enrollment Link Contracts

- Route: `enrollmentLinks.listLinks`
- Request schema: none
- Response schema: active tenant enrollment links with classroom counts, class age/notes fields, document requirement counts, website visibility, application counts, capacity fields, status, copyable public code, and tenant-correct public URL.
- Error cases: missing tenant context, unauthorized role.
- Notes: Admin/Registrar only.

- Route: `enrollmentLinks.createOrUpdateLink`
- Request schema: `{ id?, title, status?, showOnWebsite?, capacityMode, totalCapacity?, instructions?, opensAt?, closesAt?, classrooms[], documentRequirements[] }`, where `classrooms[]` may include `minimumAgeMonths`, `maximumAgeMonths`, `ageCutoffDate`, and `requirementNotes`, and `documentRequirements[]` may include optional `classRoomDepartmentId` plus `documentType`.
- Response schema: saved link with public code and nested classroom/document configuration.
- Error cases: no classrooms, invalid classroom tenant/session, invalid capacity, unauthorized role.
- Notes: classroom IDs are `ClassRoomDepartment.id` values from the active tenant. Requirement class targets must be one of the link's selected classroom IDs. Supported document types are `GENERAL`, `PASSPORT_PHOTO`, `BIRTH_CERTIFICATE`, `PREVIOUS_SCHOOL_REPORT`, and `OTHER`.

- Route: `enrollmentLinks.getApplications`
- Request schema: `{ linkId?: string | null, status?: EnrollmentApplicationStatus | null }`
- Response schema: pending application rows with selected classroom, student details, primary parent, typed submitted document metadata, document completion, status, accepted student/term links, admission payment metadata, admission-letter template metadata/URL, and approval-email sent timestamp.
- Error cases: missing tenant context, unauthorized role.

- Route: `enrollmentLinks.approveApplication`
- Request schema: `{ applicationId: string, admissionLetterTemplateId?: string | null, paymentRequired?: boolean, paymentLabel?: string | null, paymentAmount?: string | number | null, paymentCurrency?: string, paymentInstructions?: string | null, paymentLink?: string | null, paymentDueAt?: string | Date | null }`
- Response schema: `{ success: true, studentId, termFormId, appliedChargeCount }`
- Error cases: application not found, invalid tenant, invalid selected classroom, capacity reached, age requirement failed, missing applicable required documents, already approved/rejected, unknown or not-ready admission-letter template.
- Notes: approval creates or links guardian/parent, creates student/session/term forms, applies fee histories, stores payment handoff metadata and selected admission-letter template metadata, records accepted ids, sends the successful-admission email with the selected admission-letter PDF link, and records `admissionApprovalEmailSentAt` after email delivery. Built-in template IDs and ready custom admission-letter template IDs owned by the school are allowed. When `paymentRequired=true`, approval requires a positive amount plus either payment instructions or a payment link. Parent-facing admission emails use the school name as the sender display name when available.

- Route: `enrollmentLinks.rejectApplication`
- Request schema: `{ applicationId: string, reason?: string | null }`
- Response schema: `{ success: true }`
- Error cases: application not found, already approved, unauthorized role.

- Public route: `school-site /enroll/[code]`
- Request schema: public code in URL plus submitted student, selected classroom, primary parent name/email/phone, applicable class/global typed document metadata/uploads, and notes.
- Response schema: pending application success state plus parent onboarding/login hint.
- Error cases: invalid/inactive/expired/full link, invalid classroom option, failed class age requirement, missing required fields, invalid parent email/phone, future DOB, missing applicable required uploads, upload for non-applicable class requirement, unsupported file type, non-image passport photo, upload too large, missing or invalid Vercel Blob store token.
- Notes: successful public submissions send a parent confirmation email through Resend when email is configured. Parent-facing admission emails use the school name as the sender display name when available. Admission uploads are stored with unguessable Vercel Blob keys and are exposed only through authenticated admin/registrar review payloads in the current implementation.

- Public route: `school-site /api/pdf/admission-letter`
- Request schema: `{ code: string, applicationId: string, templateId?: string, download?: "true" }`
- Response schema: PDF stream for an approved admission application.
- Error cases: invalid query, application not found, application not approved, enrollment link code mismatch, invalid custom template JSON, PDF render failure.
- Notes: the route renders from approved `EnrollmentApplication` payload data and requires both the link code and application ID from the approval email. It falls back to the approved application's stored `admissionLetterTemplateId` when no query override is provided, supports built-in registry templates and ready custom JSON admission-letter templates, and includes the passport photo when a submitted document has `documentType=PASSPORT_PHOTO`.

## Document Template Contracts

- Route/action: `dashboard /settings/document-templates`
- Request schema: result-template save uses `{ templateId: string }`; custom-template request create uses `{ documentType, title, notes?, file }`; custom-template status update uses `{ requestId, status, quotedAmount?, quotedCurrency?, quotePaymentInstructions?, quotePaymentLink?, quotePaymentDueAt?, builtTemplateId?, builtTemplateVersion?, builtTemplateJson?, operatorNotes? }`.
- Response schema: server actions revalidate the settings page after successful writes.
- Error cases: missing tenant context, missing or invalid Blob token/store for uploads, unsupported file type, oversized file, invalid status, invalid quote amount, invalid payment link, quoted paid build missing payment instructions/link, selected template not owned/ready, ready custom template missing valid JSON, JSON template ID/type mismatch.
- Notes: result-template preferences can point at shared registry templates or ready custom result templates. Ready custom admission-letter templates are exposed in the enrollment approval/open/download selectors and rendered by the public admission-letter PDF route. Custom-template quotes use dashboard-visible payment instructions plus optional external links rather than native gateway checkout.

- Public website data resolver: `getPublicWebsiteData`
- Request schema: resolved public tenant profile plus optional published/template website configuration.
- Response schema: `WebsiteTemplateContentData` with config-backed collections and `admissionLinks[]`, where each admission link includes title, relative `/enroll/[code]` href, open classroom count/labels, date window, and instructions.
- Error cases: unresolved tenant or missing published config are handled by the calling public website route; manual-only, paused, archived, expired, not-yet-open, full, or deleted links are omitted.
- Notes: direct `/enroll/[code]` access is still governed by the enrollment form runtime; website admission sections are only discovery surfaces for eligible `showOnWebsite=true` links.

## Parent Portal Contracts

- Route: `parents.overview`
- Request schema: none
- Response schema: `{ wards[] }`, where each ward includes student identity, latest enrollment/application status, active classroom/term, outstanding finance summary, collection statuses for books/uniforms, and recent issuances where available.
- Error cases: missing tenant context, non-parent role, parent user not linked to any guardian.
- Notes: ward access is authorized through `Guardians.userId`.

## Search Contracts

- Route: `search.global`
- Request schema: `{ query: string, limit?: number }` where `query` is trimmed and capped at 100 characters, and `limit` is 1-20.
- Response schema: `Array<{ id: string, type: "student" | "classroom" | "staff", group: "Students" | "Classrooms" | "Staff", title: string, subtitle: string | null, href: string, rank: number }>`
- Error cases: missing tenant context returns an empty result set; queries shorter than 2 characters do not run remote record search.
- Notes: results are tenant-scoped by `schoolProfileId`; classroom results are current-session scoped when session context is available and link to `/academic/classes?viewClassroomId=<departmentId>&classroomTab=students`; student results link to `/students/<studentId>`.

## Assessment Contracts

- Route: `assessments.saveAssessement`
- Request schema: assessment setup payload with `title`, `obtainable`, `percentageObtainable`, `departmentSubjectId`, optional `id`, optional `isGroup`, optional `childAssessments[]`, and grouped `printMode: "expanded" | "total"`.
- Response schema: saved `ClassroomSubjectAssessment` parent row.
- Error cases: unauthorized subject/assessment scope, grouped parent with no children, child assessment IDs that do not already belong to the grouped parent being edited.
- Notes: grouped parent rows store the printable mode; child rows remain the scoreable assessment records.

- Route: `assessments.getClassroomReportSheet`
- Request schema: `{ departmentId: string, sessionTermId: string }`
- Response schema: classroom report sheet with subjects, scoreable non-group assessments, parent assessment metadata including `id`, `title`, `index`, and `printMode`, assessment results scoped to the selected term, and active student term forms.
- Error cases: unauthorized classroom access or invalid classroom/term scope.
- Notes: student result print/PDF uses `parentAssessment.printMode = "TOTAL"` to collapse weighted child scores into one parent column; score-entry/review tables continue to use the scoreable child rows.

- Route: `assessments.getRecordingContextOptions`
- Request schema: `{ termId?: string | null }`
- Response schema: `{ scoped: boolean, terms, classrooms, defaultTermId: string | null, defaultDepartmentId: string | null }`, where each term includes `id`, `title`, `sessionId`, `sessionTitle`, `label`, `startDate`, and `endDate`.
- Error cases: unauthenticated requests are rejected; missing tenant/session context returns empty scoped options for Teacher users; non-Teacher users receive unrestricted report terms and classrooms for the selected/default term.
- Notes: Teacher users are scoped to non-deleted `StaffTermProfile` terms and `StaffClassroomDepartmentTermProfiles` classrooms. The assessment recording page uses URL/cookie/date-derived defaults to auto-correct invalid teacher deep links; if the date-derived term has no teacher classrooms, the API falls back to the first assigned term with classrooms. If no date-current term can be inferred, the client asks the user to choose a current term and persists it through `switchSessionTerm`.

- Route: `assessments.listPublicAssessmentLinks`
- Request schema: `{ classRoomDepartmentId: string, sessionTermId: string, status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "REVOKED" }`
- Response schema: public-link audit rows for the selected classroom/term, including status, requester/admin names, expiry, captured subject/student counts, and a fresh URL only when the server can safely return one.
- Error cases: missing tenant context, unauthorized classroom access, invalid classroom/term pair.
- Notes: Admin users see the classroom/term link history. Teacher users are scoped through classroom assignment checks.

- Route: `assessments.createPublicAssessmentLink`
- Request schema: `{ classRoomDepartmentId: string, sessionTermId: string, durationHours: 24 | 48 | 168 | number, selectedDepartmentSubjectIds?: string[], selectedStudentTermFormIds?: string[] }`
- Response schema: approved link row plus one-time public URL.
- Error cases: non-admin role, invalid classroom/term, subject filter outside the classroom/term, invalid student filter, unsupported duration.
- Notes: This is the admin direct-generate path. The token is signed and only its hash is stored.

- Route: `assessments.requestPublicAssessmentLink`
- Request schema: `{ classRoomDepartmentId: string, sessionTermId: string, durationHours: number, selectedDepartmentSubjectIds?: string[], selectedStudentTermFormIds?: string[], reason: string }`
- Response schema: pending link request.
- Error cases: missing or too-short reason, unauthorized classroom/subject scope, invalid filters.
- Notes: Staff requests notify admins; no public URL is issued until approval. Email review CTAs must target the tenant dashboard host, `dashboard.{subdomain}.school-clerk.com` in production, while in-app notification links remain app-relative.

- Routes: `assessments.approvePublicAssessmentLink`, `assessments.rejectPublicAssessmentLink`, `assessments.revokePublicAssessmentLink`
- Request schema: approve `{ id: string, durationHours?: number }`; reject `{ id: string, rejectionReason?: string }`; revoke `{ id: string }`
- Response schema: updated link row, with approve returning a one-time public URL.
- Error cases: non-admin role, link outside tenant, invalid status transition, expired or revoked link.
- Notes: Approval and rejection notify the requester. Revocation immediately blocks public token use.

- Public routes: `assessments.getPublicAssessmentLink`, `assessments.updatePublicAssessmentScore`
- Request schema: get `{ token: string }`; update `{ token: string, assessmentId: string, studentTermFormId: string, departmentSubjectId: string, obtained: number | null }`
- Response schema: get returns the token-scoped classroom report sheet payload; update returns the saved score record.
- Error cases: malformed token, hash mismatch, pending/rejected/revoked/expired link, score target outside captured subject/student scope, grouped parent assessment, score above obtainable, invalid classroom/term ancestry.
- Notes: Public token routes are intentionally unauthenticated but never broaden beyond the stored classroom, term, subject, and student scope.

- Route: `assessments.updateAssessmentScore`
- Request schema: `{ assessmentId: number, studentTermId: string, studentId: string, departmentId: string, obtained?: number | null, id?: number | null }`
- Response schema: saved score record.
- Error cases: unauthorized assessment scope, grouped parent assessment, score target outside the selected classroom subject, score record mismatch.
- Notes: authenticated score entry writes only to scoreable, non-group assessment rows.

## Staff Management Contracts

- Route/action: `action.saveStaffAction`
- Request schema: `{ staffId?, email, role, assignments[] }`, where each assignment supports `scope: "CLASS" | "DEPARTMENT" | "CLASS_SUBJECT" | "DEPARTMENT_SUBJECT"` plus the matching identifiers: `classRoomId`, `classRoomDepartmentId`, `subjectId`, `departmentSubjectId`, `subjectAccessMode`, and/or `departmentSubjectIds`.
- Response schema: `{ invited, inviteError, staffId }`.
- Error cases: missing tenant/session/term context, staff not found, invalid class, invalid classroom/department, invalid subject, invalid selected department subject, selected subject outside selected department, onboarding email failure surfaced as `inviteError`.
- Notes: `DEPARTMENT` assignments preserve the legacy `subjectAccessMode = SELECTED | ALL` behavior. `CLASS`, `DEPARTMENT`, `CLASS_SUBJECT`, and `DEPARTMENT_SUBJECT` are persisted as `StaffAcademicAccessGrant` rows and resolved dynamically for teacher authorization. Classroom/subject assignment remains teacher-only; non-teaching roles persist empty assignment sets.

- Route: `staff.getFormData`
- Request schema: `{ staffId?: string }`
- Response schema: staff invite/edit options with `classes`, `classrooms`, `subjects`, `subjectsByClass`, `subjectsByClassroom`, and staff `assignments[]` including `scope` and relevant identifiers.
- Error cases: missing active school/session/term context returns empty options.
- Notes: Existing selected/all department assignments still round-trip. New broad grant rows are preferred when present; legacy rows remain a compatibility fallback for older staff records.

## School Signup And Owner Verification Contracts

- Route/action: `createSaasProfileAction`
- Request schema: `institutionName`, `institutionType`, `adminName`, `email`, `password`, optional school profile metadata, and `domainName` subdomain slug.
- Response schema: owner email, institution type label, `loginUrl`, `onboardingUrl`, `onboardingLoginUrl`, `siteUrl`, `workspaceUrl`, school name, and subdomain.
- Error cases: disabled institution type, reserved subdomain, unavailable subdomain, duplicate owner email, admin user creation failure.
- Notes: successful production signup provisions `{subdomain}.school-clerk.com` on the school-site Vercel project and `dashboard.{subdomain}.school-clerk.com` on the dashboard Vercel project. Signup also creates a 24-hour `email-verification:{token}` row in `Verification` and sends a Resend verification email. Signup emails use the school name as the sender display name when available.

- Public route: `dashboard tenant /verify-email?token=...`
- Request schema: verification token in query string.
- Response schema: public success/failure page.
- Error cases: missing token, expired token, invalid token, deleted/missing user.
- Notes: successful verification sets `User.emailVerified = true` and deletes the used `Verification` row.

- Route/action: `dashboard tenant /forgot-password` via `requestPasswordReset`
- Request schema: `{ email: string }`
- Response schema: `{ redirectTo: string | null }`, where local/development requests return the tenant reset-password URL when the submitted account exists.
- Error cases: email delivery/provider errors, invalid Better Auth request.
- Notes: reset emails render the direct tenant-aware `/reset-password?token=...&email=...` URL in the button and fallback text instead of exposing the Better Auth API reset URL. The current tenant/custom domain is preferred when the submitted email belongs to that tenant; otherwise the matched user's primary verified custom domain is preferred, falling back to the same dashboard email URL builder used by staff invite links. In development, forgot-password skips email delivery when the account exists, creates a 24-hour `reset-password:{token}` verification row, and redirects the browser directly to the tenant reset-password URL while preserving LAN/path-style shapes such as `http://<network-ip>:2200/<tenant>/reset-password`. Production reset emails use the school name as the sender display name and account copy when available. The reset page accepts both staff-scoped `reset-password:{token}` verification rows and Better Auth reset rows where the submitted token is stored as `Verification.value`.

## Student Contracts

- Route: `students.overview`
- Request schema: `{ studentId: string, termSheetId?: string | null }`
- Response schema: `{ id?: string, student: { id, name, surname, otherName, dob, gender, guardian, studentName }, studentTerms }`, where `guardian` is the first non-deleted linked guardian with `id`, `name`, `phone`, and `phone2`, and each `studentTerms[]` item includes `className`, `departmentName`, and full `classDisplayName`.
- Error cases: student not found for the active tenant; requested term sheet not found returns no active `id` while student overview data still loads.
- Notes: used by the student overview sheet/page and by the focused basic-info edit sheet. Student and term-sheet lookups are tenant-scoped by `schoolProfileId` and ignore soft-deleted rows.

- Route: `students.updateStudentBasicProfile`
- Request schema:
  ```ts
  {
    id: string;
    data: {
      name: string;
      surname: string;
      otherName?: string | null;
      gender: "Male" | "Female";
      dob?: Date | null;
      guardian?: {
        id?: string | null;
        name?: string | null;
        phone?: string | null;
        phone2?: string | null;
      } | null;
    };
  }
  ```
- Response schema: mutation success with no response body.
- Error cases: missing active tenant context, student not found in active tenant, guardian id not found in active tenant, invalid required student fields.
- Notes: updates student names, gender, and DOB. Parent details are normalized by trimming whitespace; blank or incomplete parent details clear the first existing guardian link, a supplied guardian id updates that tenant guardian, and complete parent details without an id upsert by name + phone + tenant before linking to the student.

- Route: `students.changeStudentClass`
- Request schema: `{ studentTermFormId: string, classroomDepartmentId: string }`
- Response schema: mutation success with no response body.
- Error cases: unauthenticated, role not allowed, missing active tenant context, target term sheet not found in tenant, target classroom not found in tenant, exact duplicate student name already exists in the target class/term.
- Notes: updates the selected `StudentTermForm.classroomDepartmentId` and its linked `StudentSessionForm.classroomDepartmentId` when present. It does not create a duplicate term sheet, and it blocks exact normalized `name + surname + otherName` duplicates in the target classroom/term.

- Route: `students.duplicateGroups`
- Request schema: `{ classroomDepartmentId?: string | null, sessionTermId?: string | null, studentId?: string | null }`
- Response schema: `{ scope, totalStudents, duplicateGroupCount, duplicateStudentCount, groups[] }`, where each group includes normalized name key, classroom/term scope, members with history counts, and `recommendedSurvivorId`.
- Error cases: missing active school or term context.
- Notes: groups active, non-deleted `StudentTermForm` records in a class/term by normalized `Students.name + surname + otherName`. When `studentId` is supplied, the response narrows to duplicate groups containing that student.

- Route: `students.previewDuplicateMerge`
- Request schema: `{ classroomDepartmentId?: string | null, sessionTermId?: string | null, survivorStudentId: string, duplicateStudentIds: string[] }`
- Response schema: `{ group, survivorStudentId, duplicateStudentIds, primaryTermFormId, recordsToMove, conflicts, canMerge }`
- Error cases: unauthenticated, role not allowed, missing active tenant context, selected students are no longer a duplicate group.
- Notes: recommends and previews moving duplicate references into the survivor. It blocks execution when multiple current-term copies have assessment, attendance, or finance records that need manual review, and when assessment records would collide with the unique `(studentId, studentTermFormId, classSubjectAssessmentId)` key after merge.

- Route: `students.mergeDuplicates`
- Request schema: same as `students.previewDuplicateMerge`.
- Response schema: `{ success, survivorStudentId, mergedStudentIds, primaryTermFormId, recordsMoved }`
- Error cases: unauthenticated, role not allowed, stale/non-duplicate group, unresolved preview conflict, tenant/class/term mismatch.
- Notes: re-runs the preview inside a transaction, moves safe term-form and direct student references to the survivor, updates enrollment accepted ids where applicable, preserves notification recipient history under one surviving student notification contact, soft-deletes duplicate term forms, and soft-deletes duplicate student records. It never hard-deletes historical records.

- Route: `students.deleteTermSheet`
- Request schema: `{ id: string }`
- Response schema: mutation success with no response body.
- Error cases: unauthenticated, role not allowed, missing active tenant context, term sheet not found in tenant.
- Notes: soft-deletes the selected student term sheet only.

- Route: `students.deleteStudent`
- Request schema: `{ studentId: string }`
- Response schema: mutation success with no response body.
- Error cases: unauthenticated, role not allowed, missing active tenant context, student not found in tenant.
- Notes: soft-deletes the student plus active tenant-scoped student term/session forms for that student.

- Route: `students.getImportNameGuide`
- Request schema: none
- Response schema: `{ names: string[] }`
- Error cases: missing tenant context
- Notes: returns a compact tenant-scoped unique list from non-deleted existing students' `name`, `surname`, and `otherName` fields. The dashboard import parser uses this guide for whitespace-only name splitting, including Arabic-aware normalization, before falling back to plain whitespace tokens.

- Route: `students.studentsRecentRecord`
- Request schema: none
- Response schema: `{ students, sessionTermId, schoolSessionId, classDepartments, term }`, where `students` contains non-deleted tenant students with basic identity, gender, current/recent classroom metadata, `termId`, `schoolSessionId`, term sheet id, term/session labels, and current-session form id when applicable.
- Error cases: missing tenant context
- Notes: used by student import review for classroom selection, existing-student search, and same-session/same-term match badges.

- Route: `students.verifyStudentImport`
- Request schema: optional fallback `classroomDepartmentId`, plus `rows` array of `{ lineNumber: number, originalText: string, name: string, surname: string, otherName?: string | null, gender?: string | null, classroomDepartmentId?: string | null }`
- Response schema: `{ results: Array<{ lineNumber, originalText, name, surname, otherName, inputGender, inferredGender, genderInferenceDetails: { confidence: number, sampleSize: number, source: string } | null, needsGender: boolean, status: 'readyToImport' | 'matchFound' | 'needsAttention', classRoom: string | null, classroomDepartmentId: string | null, fullMatch: MatchMeta | null, suspectedMatches: MatchMeta[] }> }` where MatchMeta is a student record metadata block containing name, classroom, term/session details, match confidence (0-100), and matching reason.
- Error cases: missing active school/session/term context returns a structured tRPC `UNAUTHORIZED` error; any supplied classroom department not found, unauthorized, or outside the active session returns a structured tRPC `BAD_REQUEST` error.
- Notes: performs single-query batch validation for pasted student imports. Checks exact matches, flags edit-distance name typos (<= 2), infers missing gender with confidence >= 80% (min 2 samples), validates all supplied row-level classroom ids once, and avoids large child records to keep payloads compact. Rows without a row-level or fallback classroom are returned as `needsAttention`.

- Route: `students.verifyStudentImportBatch`
- Request schema: same as `students.verifyStudentImport`
- Response schema: same as `students.verifyStudentImport`
- Error cases: same as `students.verifyStudentImport`
- Notes: POST-backed mutation wrapper for the dashboard student-import modal. Use it for large pasted batches to avoid URL-length limits while preserving the same verification semantics as the query route. Production-like tenant routing must leave `/api/trpc` requests on the tRPC handler and return JSON for both valid responses and structured tRPC errors.

- Route: `students.bulkDeleteTermSheets`
- Request schema: `ids[]` where each id is a `StudentTermForm.id`
- Response schema: `{ count: number }`
- Error cases: empty selection, invalid term form ids, missing tenant context
- Notes: soft-deletes multiple student term records in one request for classroom results batch removal, scoped to the active school tenant and limited to non-deleted rows

## Student Import Contracts

- Route: `students.executeStudentImport`
- Request schema:
  ```ts
  {
    classroomDepartmentId?: string | null;
    rows: {
      lineNumber: number;
      name: string;
      surname: string;
      otherName?: string | null;
      gender: "Male" | "Female";
      classroomDepartmentId?: string | null;
      action: "import_new" | "keep_match" | "update_match_with_name";
      existingStudentId?: string | null;
    }[];
  }
  ```
- Response schema:
  ```ts
  {
    createdStudents: number;
    keptMatches: number;
    updatedMatches: number;
    termSheetsCreated: number;
    skippedRows: number;
    failedRows: number;
    rows: {
      lineNumber: number;
      action: string;
      status: "created" | "kept" | "updated" | "skipped" | "failed";
      studentId?: string | null;
      termSheetCreated?: boolean;
      reason?: string;
    }[];
  }
  ```
- Error cases: missing active school/session/term context returns a structured tRPC `UNAUTHORIZED` error; missing/supplied classroom errors return structured tRPC `BAD_REQUEST` errors; exact duplicate `import_new` rows, existing student not in tenant, and current-term conflicting classroom conditions are reported as row-level failures where possible.
- Notes: mutation that creates students, keeps/updates matched students, and idempotently creates term sheets. The dashboard may send many selected rows for batch import or a single row for the row-level `Import row` action. Validates all supplied row-level classrooms against active school AND session ancestry. Detects cross-classroom current-term conflicts and exact normalized duplicate names in the target class/term, then reports them as row-level failures rather than creating duplicates. Applies fee histories to newly-created term sheets using the row target classroom. Per-row failures do not block successful rows.
- Dashboard cache invalidation on success:
  - Invalidates: `students.index`, `students.analytics`, `students.studentsRecentRecord`, `classrooms.all`
  - Report-sheet queries (`classroomReportSheet`, `getSubjectAssessmentRecordings`) require parameterized keys (classroom + term) not available in the import component context; these views refresh on navigation.
  - Finance query keys (fee histories, transaction streams, student balances) are parameterized per-student/per-classroom; fee histories applied during import are reflected on navigation.

- Route: `students.startStudentImportJob`
- Request schema: same row execution payload as `students.executeStudentImport`.
- Response schema:
  ```ts
  {
    id: string;
    status:
      | "PENDING"
      | "RUNNING"
      | "COMPLETED"
      | "COMPLETED_WITH_FAILURES"
      | "FAILED"
      | "CANCELLED";
    totalRows: number;
    processedRows: number;
    createdStudents: number;
    keptMatches: number;
    updatedMatches: number;
    termSheetsCreated: number;
    skippedRows: number;
    failedRows: number;
    errorMessage?: string | null;
    triggerRunId?: string | null;
    rows: ExecuteStudentImportResult["rows"];
  }
  ```
- Error cases: same active-context and classroom validation errors as `students.executeStudentImport`; Trigger queueing failures fail job creation before the dashboard enters progress mode.
- Notes: creates a tenant-scoped `StudentImportJob` plus one persisted `StudentImportJobRow` per executable reviewed row, stores active school/session/term and operator id on the job, then queues the `process-student-import-job` Trigger.dev task. The dashboard uses this path for selected-row batch execution so large imports are not held inside one long HTTP request. Skipped dashboard rows remain client-side exclusions and are shown in the summary as skipped-before-execution.

- Route: `students.getStudentImportJob`
- Request schema: optional `{ jobId?: string }`. When omitted, returns the current user's latest active/recent student import job in the active tenant.
- Response schema: same as `students.startStudentImportJob`.
- Error cases: missing active school context returns `UNAUTHORIZED`; missing or cross-tenant jobs return `NOT_FOUND`.
- Notes: reads persisted job progress and row-level results for dashboard polling and recovery after refresh/modal reopen. Tenant ownership is enforced through `schoolProfileId`, and active/recent discovery is additionally scoped to `createdByUserId` when the current user is known.

## Finance Contracts

- Route: `transactions.createSchoolFee`
- Request schema: `title`, `amount`, optional `description`, optional `feeId`, optional `streamId`/`streamName`, `classroomDepartmentIds[]`
- Response schema: mutation success with current-term `FeeHistory` created or updated in place
- Error cases: invalid term, missing tenant context, invalid stream/classroom references
- Notes: editing an existing current-term fee now updates the active `FeeHistory` row instead of always creating a new version

- Route: `transactions.deleteSchoolFeeCurrentTerm`
- Request schema: `feeHistoryId`
- Response schema: `{ success: true, title: string }`
- Error cases: fee history not found for current tenant/term
- Notes: soft-deletes only the current-term `FeeHistory`; older term records remain intact

- Route: `finance.receiveStudentPayment`
- Request schema: `studentId`, `studentTermFormId`, `paymentMethod`, optional `paymentDate`, optional `reference`, `amountReceived`, `allocations[]`
- Response schema: `{ success: true, count: number, totalAllocated: number, paymentIds: string[] }`
- Error cases: allocation total mismatch, overpayment against pending amount, fee history outside the student's classroom scope
- Notes: `paymentIds` powers receipt printing/downloading immediately after payment capture, and successful student payment capture now also dispatches tenant-scoped in-app plus email notifications using a typed notification registry

- Route: `finance.getStreamDetails`
- Request schema: `streamId`
- Response schema: `{ id, name, type, createdAt, periodLabel, totalIn, totalOut, balance, pendingBills, pendingBillsCount, owingAmount, activeBillables, activeBillablesCount, projectedBalance, transactions[], records[] }` where `records[]` combines cash transactions, stream bills, and active billables
- Error cases: stream not found for current tenant, missing tenant context
- Notes: used by `/finance/streams/[streamId]` to open a stream from the finance accounting grid into a statement-style detail page with both cashflow and payable visibility

- Route: `finance.payStaffBill` / `finance.payServiceBill`
- Request schema: `billId`, `amount`, optional `date`
- Response schema: `{ success: true, amount, fundedAmount, owingAmount, status, paymentId }`
- Error cases: bill not found, payment already active, missing tenant context
- Notes: payment now uses available stream funds first and records uncovered balance in `BillSettlement` instead of failing all-or-nothing

- Route: `finance.repayBillOwing`
- Request schema: `billId`, `amount`, optional `date`
- Response schema: `{ success: true, billId, repaidAmount, outstandingOwing, title }`
- Error cases: payable has no outstanding owing, no available stream funds, bill not found for tenant
- Notes: reduces outstanding owing after later stream funding without reopening the original payable, and records each repayment as a settlement repayment entry linked to a wallet transaction

- Route family: `finance.*`
- Auth schema: authenticated tenant session required; finance read/write access is role-gated server-side for `Admin` and `Accountant`
- Notes: this now applies consistently to streams, bills, billables, payroll, service payments, student payment receipt/reversal, and collections routes

- Route: `finance.getReceivePaymentOptions`
- Request schema: `{ studentId, termId?, sessionId? }`
- Response schema: selected student context, current term/session/class context, `paymentTypes[]` grouped by account/stream, each with configured description/item options and outstanding-charge options, summary counts/totals, and permission flags for receiving payment, simple collection creation, school-fee creation, reusable description creation, and one-off manual charges.
- Error cases: missing tenant context, student not found for tenant, unauthorized finance read access.
- Notes: read model for the simplified cashier receive-payment flow. It filters configured collectable items by tenant, active/current term or global scope, session scope, and student classroom applicability. Outstanding student charges remain available even when their item is inactive or from an older term.

- Route: `finance.receiveStudentPaymentSimple`
- Request schema: `{ studentId, studentTermFormId?, chargeId?, itemId?, streamId?, streamName?, paymentTypeTitle?, descriptionTitle?, description?, amountDue?, amountPaid, method?, paymentDate?, reference?, note?, termId?, sessionId? }`
- Response schema: `recordFinancePayment` result including `{ success, paymentId, paymentIds, allocationId, count, totalAllocated, chargeStatus }`.
- Error cases: missing tenant context, unauthorized finance write access, missing/invalid student or term sheet, payment amount not positive, amount paid greater than amount due, overpayment against an existing charge, configured item not active/collectable/applicable to the student.
- Notes: simplified cashier submit adapter. It can pay an existing outstanding charge, create a charge from a configured collectable finance item, or quick-create a one-off/simple collection charge under an existing or newly named finance stream before recording the payment. `termId` / `sessionId` are treated as the collected-in term/session for the payment and ledger entry, while the charge keeps the paid-for term.

- Route: `finance.getTermLedger`
- Request schema: `{ termId?, sessionId? }`
- Response schema: derived term-ledger payload with term/session identity, status label, account/stream summaries, money in/out, available balance, deficit count/amount, outstanding payable count/amount, needs-funding account count, lifecycle metadata, and permission flags.
- Error cases: missing tenant context, missing term context, term not found for tenant, unauthorized finance read access.
- Notes: first implementation is a derived read model over the active `SessionTerm`, finance streams, and ledger entries. Persistent term-close snapshots and carry-forward records are deferred to the term close/carry-forward implementation slice.

- Route: `finance.getTermAccountStatement`
- Request schema: `{ streamId, termId?, sessionId? }`
- Response schema: selected term/session ids, account identity with operator-facing labels (`Money In`, `Money Out`, `Available Balance`, `Deficit`, `Needs Funding`), summary totals, and up to 500 ledger entries mapped to `money-in` / `money-out` directions with collected-in term ids, paid-for term ids, charge, payment, transfer, and payer context.
- Error cases: missing tenant context, missing term context, stream not found for tenant, unauthorized finance read access.
- Notes: statement read model for opening a term account/stream from the term ledger. The route keeps the raw stream direction under `technicalAccountType`; operator UI should use the provided labels and `money-in` / `money-out` directions.

- Route: `finance.getPayees` / `finance.upsertPayee`
- Request schema: list `{ q?, type? }`; upsert `{ id?, name, type, phone?, email?, note? }`
- Response schema: reusable payee rows with usage counts for charges, payments, and purchases.
- Error cases: missing tenant context, unauthorized finance access, invalid payee id.
- Notes: reusable vendors, service providers, casual workers, and other external payees are tenant-scoped and normalized by name for quick-create reuse.

- Route: `finance.upsertPayrollStructure`
- Request schema: `{ id?, staffProfileId?, streamId?, streamName?, title, cadence, baseAmount, allowanceAmount?, deductionAmount?, advanceAmount?, bonusAmount?, roleLabel?, isActive?, sessionId?, termId?, notes? }`
- Response schema: saved payroll structure with numeric amount fields and computed `netAmount`.
- Error cases: missing tenant context, unauthorized finance write access, invalid staff profile.
- Notes: teaching and non-teaching staff share the same structure model; `roleLabel` and staff role/title provide filtering context. Cadence supports salary and wage styles: monthly, term, daily, hourly, task, and one-off.

- Route: `finance.createPayrollObligation`
- Request schema: `{ payrollStructureId, title?, description?, amount?, dueDate?, sessionId?, termId? }`
- Response schema: created `FinanceCharge` salary/wage payable.
- Error cases: missing tenant context, unauthorized finance write access, payroll structure not found.
- Notes: generated obligations are canonical finance charges linked back to the payroll structure and salary/wages stream, so payment and term-ledger effects use the standard charge/payment/ledger path.

- Route: `finance.recordPurchase`
- Request schema: `{ id?, kind, streamId?, streamName?, payeeId?, payeeName?, payeeType?, title, description?, quantity?, unitCost?, totalCost?, amountPaid?, method?, paymentDate?, receiptNumber?, reference?, note?, sessionId?, termId? }`
- Response schema: `{ success, purchaseId, chargeId, paymentId?, streamId, payeeId?, status, totalCost, amountPaid }`
- Error cases: missing tenant context, unauthorized finance write access, paid amount greater than purchase cost, closed term ledger, invalid stream/payee.
- Notes: records purchases, services, vendor bills, direct expenses, reimbursements, and labor costs. Every purchase creates a canonical payable charge; immediate payments call `recordFinancePayment` and create money-out ledger entries.

- Route: `finance.cancelPurchase`
- Request schema: `{ purchaseId, reason }`
- Response schema: `{ success, purchaseId, status, reversedPaymentId? }`
- Error cases: missing tenant context, unauthorized finance write access, purchase not found.
- Notes: preserves the purchase row, cancels the linked charge, and reverses the linked payment through the standard payment reversal path when money had already gone out. Paid purchases become `REFUNDED`; unpaid purchases become `CANCELLED`.

- Route: `finance.getStaffFinanceHistory`
- Request schema: `{ staffProfileId, termId?, sessionId? }`
- Response schema: staff identity, payroll structures, salary/wage charges with receipts, and totals for due, paid, and outstanding.
- Error cases: missing tenant context, unauthorized finance read access, staff not found.
- Notes: used by the staff profile Finance tab so salary structure, wage/salary history, advances/deductions, unpaid balances, and receipts are visible from the profile context.

- Route: `finance.getPayeeHistory`
- Request schema: `{ payeeId, termId?, sessionId? }`
- Response schema: payee identity, purchase/service records, canonical charge/payment links, totals paid/outstanding, and receipts.
- Error cases: missing tenant context, unauthorized finance read access, payee not found.
- Notes: vendor/non-staff history remains linked to canonical finance records rather than duplicated into a separate ledger.

- Route: `finance.getProjectAccountSummary`
- Request schema: `{ streamId, termId?, sessionId? }`
- Response schema: account statement plus project summary fields: transferred funding, student sales income, purchase cost, labor cost, service cost, reimbursement cost, total cost, profit/loss, purchases, and entries.
- Error cases: missing tenant context, unauthorized finance read access, missing term context, stream not found.
- Notes: supports product/project accounts such as Uniforms or Books without requiring full inventory/warehouse management.

- Route: `finance.transferFunds`
- Request schema: `{ fromStreamId, toStreamId, amount, note, sentById? }`
- Response schema: `{ success: true, transferId }`
- Error cases: missing tenant context, unauthorized finance write access, same source/destination account, missing note/reason, missing source/destination stream, large transfer without Admin role, insufficient source balance for non-Admin users.
- Notes: creates paired ledger entries, debiting the source account and crediting the destination account. Admin users may override insufficient-balance transfers for approved correction/funding scenarios; transfers above `NGN 250,000` require Admin role.

- Route: `finance.previewTermClose`
- Request schema: `{ termId?, sessionId?, nextTermId? }`
- Response schema: selected ledger snapshot, next-term target, blockers, warnings, and per-account carry-forward rows.
- Error cases: missing tenant context, missing/invalid term context, unauthorized finance read access.
- Notes: preview is derived and does not write. It reports outstanding-payable warnings and whether next-term opening entries can be created.

- Route: `finance.closeTermLedger`
- Request schema: `{ termId?, sessionId?, nextTermId? }`
- Response schema: `{ success, closeId, status: "CLOSED", carryForwards[], warnings[] }`
- Error cases: missing tenant context, non-Admin role, already closed term, invalid term context.
- Notes: creates `FinanceTermLedgerClose`, one `FinanceTermCarryForward` per non-zero account balance, and next-term opening `FinanceLedgerEntry` adjustment rows when a next term is available. Closed ledgers block normal payment/charge/transfer writes until reopened.

- Route: `finance.reopenTermLedger`
- Request schema: `{ termId?, sessionId? }`
- Response schema: `{ success, closeId, status: "REOPENED" }`
- Error cases: missing tenant context, non-Admin role, closed term not found.
- Notes: marks the latest closed ledger row as reopened. Historical carry-forward rows are preserved for audit; correction/reversal policy remains a follow-up.

- Route: `finance.getFinanceIntegrityReport`
- Request schema: optional `termId`
- Response schema: `{ totals, checks[], mismatches }`, including pre-close checks for missing ledger terms, negative accounts, pending payables, unresolved transfers, cancelled/refunded records with ledger effects, and unmatched carry-forward rows.
- Error cases: missing tenant context, unauthorized finance read access
- Notes: powers the reconciliation workspace with operator-facing integrity checks before close/carry-forward.

- Route: `finance.getFinanceReports`
- Request schema: optional `termId`
- Response schema: `{ summary, streams[], accounts[], termLedgers, payroll[], payables[], purchases[], servicePayments[], collections[], arrears[], productProjectAccounts[], reconciliation, auditTrail, owingLedger[] }`
- Error cases: missing tenant context, unauthorized finance read access
- Notes: canonical reporting snapshot used for reconciliation exports and operator reporting. `auditTrail` is a projection over canonical finance records and actor fields (`createdById`, `receivedById`, `sentById`, close/reopen ids), not a separate immutable audit-log table.

- Route: `finance.generateBillsFromBillables`
- Request schema: optional `termId`, optional `billableIds[]`
- Response schema: `{ success: true, created[], skipped[] }`
- Error cases: invalid tenant context, unauthorized finance write access
- Notes: generates payable bills from active service billables while preventing duplicates per current billable history

- Route: `finance.backfillBillSettlements`
- Request schema: optional `termId`
- Response schema: `{ success: true, hydrated: number }`
- Error cases: invalid tenant context, unauthorized finance write access
- Notes: hydrates older invoice-backed payable rows into the settlement model used by current stream funding

- Route: `finance.cancelServiceBillPayment`
- Request schema: `billId`
- Response schema: `{ success: true, amount: number, title: string | null, staffName: string | null }`
- Error cases: bill not found, no active/cancelled-compatible payment on the bill, missing tenant context
- Notes: cancels the linked wallet transaction without erasing bill history, so finance UIs can render a `Cancelled` state and still allow a later re-payment

- Route: `finance.cancelStaffBillPayment`
- Request schema: `billId`
- Response schema: `{ success: true, amount: number, title: string | null, staffName: string | null }`
- Error cases: bill not found, no active/cancelled-compatible payment on the bill, missing tenant context
- Notes: mirrors service-payment cancellation semantics for payroll and dispatches payroll cancellation notifications

- Route: `notifications.list`
- Request schema: `take`, `onlyUnread`
- Response schema: `Notification[]` scoped to the authenticated tenant user and ordered newest-first
- Error cases: missing tenant session context
- Notes: powers the bell popover and the full `/notifications` page

- Route: `notifications.unreadCount`
- Request schema: none
- Response schema: `number`
- Error cases: missing tenant session context
- Notes: badge source for header notification bell

- Route: `notifications.markRead`
- Request schema: `notificationId`
- Response schema: updated `Notification`
- Error cases: notification not found for the current tenant user, missing tenant session context
- Notes: ownership check is enforced before marking a notification as read

- Route: `notifications.markAllRead`
- Request schema: none
- Response schema: Prisma `updateMany` result
- Error cases: missing tenant session context
- Notes: bulk read action for bell and notifications page

## Staff Contracts

- Route: `staff.getStaffList`
- Request schema: optional `q`, optional `status` in `all | pending | active | failed`
- Response schema: `{ items[], stats }` where each item includes role, onboarding status, invite timestamps, classroom count, subject count, and resend eligibility
- Error cases: missing tenant school/session/term context
- Notes: onboarding status is resolved from invite fields plus available auth credentials so existing staff can appear active even before explicit backfill

- Route: `staff.getFormData`
- Request schema: optional `staffId`
- Response schema: `{ roles[], classrooms[], subjectsByClassroom, staff }`
- Error cases: staff not found for current tenant, missing tenant context
- Notes: `subjectsByClassroom` supports the invite-first assignment UI where admins choose one or more classrooms and then multiple subjects inside each classroom

- Route: `action.saveStaffAction`
- Request schema: `email`, `role`, `assignments[]` where each assignment is `{ classRoomDepartmentId, departmentSubjectIds[] }`
- Response schema: `{ invited, inviteError, staffId }`
- Error cases: invalid classroom/subject combinations, missing tenant context, invite delivery failure
- Notes: creates or updates the staff record, syncs tenant user role, persists teacher-only assignments, creates a 24-hour staff-scoped onboarding reset token, and queues the shared staff invitation email through the Trigger `send-staff-invitation-email` job when required. Staff invitation emails use the school name as the sender display name when available. In development, email CTA links prefer LAN-IP path-style dashboard URLs such as `http://<network-ip>:2200/<tenant>/reset-password` so links opened from another device can reach the tenant workspace.

- Route: `action.resendStaffOnboardingAction`
- Request schema: `staffId`
- Response schema: `{ invited: true }` after email delivery, or `{ invited: false, inviteError, inviteLink }` in development when local email configuration prevents delivery and a manual onboarding link is generated instead
- Error cases: missing tenant context, no staff email, onboarding already completed, invite delivery failure
- Notes: creates a fresh 24-hour staff-scoped onboarding reset token, queues the shared staff invitation email through the Trigger `send-staff-invitation-email` job, resets invite state to pending, and records resend timestamp. In development, email CTA links prefer LAN-IP path-style dashboard URLs such as `http://<network-ip>:2200/<tenant>/reset-password` so links opened from another device can reach the tenant workspace. Production invite queueing failures remain errors; the manual-link fallback is development-only for missing `DEV_EMAIL_RECIPIENT`, missing `RESEND_API_KEY`, or Resend sender-domain verification failures.

- Route: `action.copyStaffOnboardingLinkAction`
- Request schema: `staffId`
- Response schema: `{ inviteLink }`
- Error cases: missing tenant context, no staff email, onboarding already completed, invalid staff role, link generation failure
- Notes: creates a fresh 24-hour reset-password verification token and returns a staff-scoped onboarding URL with the canonical `token` query parameter, without sending email or revoking other active reset tokens.

- Route: `action.getPasswordResetTokenStatus`
- Request schema: reset/onboarding token string.
- Response schema: `{ status: "missing" | "invalid" | "expired" | "valid", expiresAt: string | null }`
- Error cases: none surfaced to the user for missing/invalid/expired token states.
- Notes: the reset-password page checks this before calling Better Auth so expired staff onboarding links can show an explicit expired-link message instead of Better Auth's generic invalid-token error.

- Route: `action.completeStaffOnboardingAction`
- Request schema: `staffId`, `email`, `name`, optional `title`, optional `phone`, optional `phone2`, optional `address`
- Response schema: `{ staffId, completed: true }`
- Error cases: onboarding link no longer matches a staff record
- Notes: used after password reset in the onboarding link flow to complete the staff profile and mark onboarding active

## AI Chat Contracts

- Route: `POST /api/chat`
- Request schema: `{ conversationId, input }` where `input` is either `{ kind: "text", text }` or `{ kind: "workflow", action }`
- Response schema: AI SDK UI message stream response, plus response headers `x-school-clerk-conversation-id`, `x-school-clerk-run-id`, `x-school-clerk-provider`, and `x-school-clerk-model`
- Error cases: unauthorized tenant/user, assistant disabled, role not allowed, conversation not found, invalid workflow payload
- Notes: persists the incoming user message, creates an `AssistantRun`, enforces role/capability checks, and records tool execution telemetry

- Route: `GET /api/chat/conversations`
- Request schema: none
- Response schema: `{ conversations[], capabilities[], config }`
- Error cases: unauthorized tenant/user
- Notes: returns tenant-user scoped conversation summaries, but the FAB treats the first/latest active conversation as the single canonical chat and does not expose conversation switching

- Route: `POST /api/chat/conversations/:conversationId/messages`
- Request schema: `{ role: "assistant" | "system", content, parts[] }`
- Response schema: `{ message }`
- Error cases: unauthorized tenant/user, conversation not found, invalid message part payload
- Notes: used by the client to persist the final assistant UI message after streaming completes

- Route: `POST /api/chat/settings`
- Request schema: assistant config payload including `enabled`, provider/model preferences, allowed roles, enabled/disabled capabilities, analytics/feedback flags, and `maxSteps`
- Response schema: `{ config }`
- Error cases: unauthorized tenant/user, non-admin access, invalid config payload
- Notes: assistant settings are tenant-scoped and currently admin-managed

- Route: `GET /api/chat/analytics`
- Request schema: none
- Response schema: `{ analytics }` including conversation count, run count, failed runs, top tool usage, average rating, recent runs, and unresolved demand samples
- Error cases: unauthorized tenant/user, analytics disabled
- Notes: analytics are currently user-scoped within the tenant widget experience
