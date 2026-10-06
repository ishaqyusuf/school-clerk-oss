# Institution configuration

## Import reference/preview reads — implemented, untested (2026-09-22)

`students.getStudentImportReference` returns names, canonical candidate summaries, consistent academic context, owned current-session classrooms and observed view scope. `getImportNameGuide` and both `verifyStudentImport`/`verifyStudentImportBatch` routes share the import Admin/Registrar Students/Academics/Finance boundary and independent DB authorization. Preview input comes from the bounded utils schema. Setup/review use the dedicated reference query; broad recent-record/classroom readers remain for their other callers and are not declared audited here. ADR-0062; full client-context binding and verification remain open.

## Import execution boundary — implemented, untested (2026-09-22)

ADR-0061 follow-up: execution schemas/results are shared through utils; direct execution and persisted jobs now call DB-owned `executeStudentImportRow`. DB-owned `runStudentImportJob` backs the Trigger task through the public DB package, removing its API dependency; the API processor export remains a serialization compatibility wrapper. Enrollment/fee ancestry checks replace first-match helpers without changing request/result shapes. Full import preview/read/client coverage and all verification remain open.

`students.executeStudentImport`, `startStudentImportJob` and `getStudentImportJob` use the Students/Academics/Finance Admin/Registrar procedure and independently invoke the DB-owned import access helper through a thin adapter. Public execution derives session authority; the persisted processor invokes the shared transaction-local row operation with job authority and locked scope/payload. Start writes job+rows atomically before provider dispatch. Status lookup restricts explicit/latest jobs to current creator/school. Result shapes remain unchanged; internal worker results omit browser provider tokens (ADR-0059). DB-owned row receipts now commit with domain writes; recovery preserves existing receipts, legacy RUNNING rows require review and aggregates preserve terminal jobs (ADR-0060). Full worker package extraction, deeper integrity and verification remain open.

## Shared profile/gender update — implemented, untested (2026-09-08)

`students.updateStudentBasicProfile` and `students.changeGender` use Admin/Registrar Students procedures, shared profile schemas, `db/queries/student-profile-update.ts` and DB-owned `updateStudentProfile`. Extra Academics/Finance authority is conditional on changed gender with active enrollment references. The old inline profile/gender transactions, first-guardian selection and independent fee loop are removed; compatibility exports remain. `useUpdateStudentProfile` backs the basic editor and reusable gender control. Admission and profile services now share internal fee preparation; clients share student/finance invalidation. ADR-0058; broader import writers and all tests remain open.

## Shared admission classification — implemented, untested (2026-09-08)

`students.setAdmissionType` and `students.bulkSetAdmissionType` use Admin/Registrar + Students/Academics/Finance procedures, shared client-safe schemas, a thin `db/queries/student-admission-type.ts` adapter and DB-owned `classifyStudentTermForms`. Existing students query exports remain compatibility aliases; its independent transaction is removed. Directory bulk classification uses `useClassifyStudentTerms` with originating scope, no retry/offline queue, guarded completion, student/finance invalidations and retained error/selection. ADR-0057; no runtime/schema operations or tests.

## Scoped class-change picker/client — implemented, untested (2026-09-08)

New `students.classChangeOptions` uses the student-academic procedure, shared options schema and `readStudentClassChangeOptions` service, delegating minimal source/destination reads to DB ownership. Overview and directory bulk views now use `useMoveStudentTerms` for options and scope-bearing bulk submission; their former general classroom reads/direct mutations are removed. Returned student/term IDs and relevant list/report families are invalidated on success even if the originating view disappeared. ADR-0056 supersedes the prior pending class-client integration note; broader endpoints and all verification remain open.

## Shared class changes — implemented, untested (2026-09-08)

`students.changeStudentClass` and `students.bulkChangeClass` now use the student-academic procedure and shared utils schemas. Compatibility exports from the existing student query module delegate to `db/queries/student-class-change.ts`, then DB-owned `moveStudentTermForms`; direct service calls parse/recheck authorization. Independent legacy implementations are removed. Both current dashboard callers now use the shared scope-bound hook and dedicated target-options read with guarded callbacks, invalidation and recovery (ADR-0056). See ADR-0055; no live change/schema operation or verification ran.

## Term-detail read — implemented, untested (2026-09-08)

`students.getTermFormDetails` now uses the student-academic procedure, `schemas/student-term-details.ts` and `db/queries/student-term-details.ts`. The service rechecks live authorization/scope in a RepeatableRead transaction and calls DB-owned guarded target/section projections. It no longer reuses a deletion schema or performs inline unrestricted relation includes. The dashboard's dedicated detail hook and extracted removal dialog replace the sole current consumer; identity/role/revision inputs use normal query keys compatible with removal's ID invalidation. ADR-0054 supersedes earlier notes that this read boundary was still pending. No schema/live operation; all verification remains deferred.

## Shared term removal — implemented, untested (2026-09-08)

`students.deleteTermSheet` and `students.bulkDeleteTermSheets` now require the student-academic procedure and delegate through `db/queries/student-term-removal.ts` to DB-owned `softDeleteStudentTermForms`. Direct service calls repeat live authorization and validation; old independent update queries are removed. The independent `getTermFormDetails` read is now guarded separately by ADR-0054. Seven dashboard mutation instances now use `useRemoveStudentTerms`, which normalizes single/bulk selection into the bulk RPC with displayed identity scope, no retry/offline queue, context-safe callbacks and record/list/report invalidations. No live removal/schema change. See ADR-0052/0053; verification and broader domain boundaries remain open.

## Shared student deletion — implemented, untested (2026-09-08)

`students.deleteStudent` delegates to a thin API adapter and DB-owned `softDeleteStudent`. The dashboard `deleteStudent`/`deleteStudentAction` exports use the same service without a nested transaction or optional DB argument; directory revalidation follows commit. Router requires Students + Admin/Registrar; DB checks fresh context and conditional Academics access. Shared dashboard hook is now the direct RPC caller for directory/overview deletion. No new endpoint/schema or live deletion. Term-removal/class-change services remain separate. See ADR-0051.

## Legacy migration actions — contained, unverified (2026-09-08)

All identified `/migration` server/cookie actions and migration-only dashboard create/import/enrollment exports now call a server-only ownership-required gate before data/cache/transaction work. `/migration` composes an authorized notice instead of importing historical data/loaders/auto-import UI. The unused global API `updateStudentTermFormStudentId` helper was removed after caller checks; no endpoint called it. Current registration RPC is unchanged. Migration functionality awaits ownership approval and scoped replacement, not a toggle. See ADR-0050 and the legacy migration feature; no live action or test ran.

## Registration service extraction — implemented, untested (2026-09-08)

`students.createStudent` now delegates to `db/queries/student-registration.ts`, with DB-owned registration scope/target/guardian/persistence helpers. The router requires Students + Admin/Registrar; the service rechecks live access and operation-specific Academics/Finance permissions within its Serializable write transaction. Compatibility query exports retain their names; `createStudentForm` delegates without a nested transaction. No endpoint added or schema changed. Legacy dashboard create/import/repair routes remain separate open coverage. See ADR-0049.

## Fee-preview service extraction — implemented, untested (2026-09-08)

`academics.previewApplicableFeeHistories` now uses `schemas/student-fee-preview.ts` and a guarded API service, with term/classroom/item queries in the DB package. Both client forms and the student-create footer use a shared scoped preview hook. No endpoint added, mutation introduced or schema changed. Existing DTO retained; invalid targets now error. ADR-0048 documents ownership, scope and deferred checks.

## Term enrollment service replacement — implemented, untested (2026-09-08)

`academics.entrollStudentToTerm` delegates through a bounded API adapter to `enrollStudentInAcademicTerm` in the DB package; the old helper remains a compatibility wrapper. Enrollment and `academics.previewApplicableFeeHistories` now require Admin/Registrar with Students + Academics + Finance. Overview exposes `capabilities.enroll`; no new endpoint or schema. ADR-0047 records atomic writes, replay/conflict response and incomplete adjacent coverage.

## Student overview integrity extension — implemented, untested (2026-09-08)

Existing student academic read endpoints now return explicit per-term enrollment integrity state. `students.overview` also supports optional live-checked `viewScope` and returns matching `scope`; dashboard page/sheet/basic-editor queries are migrated. No new mutation endpoint or schema. ADR-0046 and [student overview](../features/student-academic-overview.md) describe client masking/retry and deferred mutation/verification work.

## Student academic management reads — implemented, untested (2026-09-08)

`students.overview`, `students.academicsOverview` and `academics.getStudentTermsList` now delegate to the shared guarded student-academic read. Router and direct service require both Students and Academics with live Admin/Registrar access. No new endpoint, mutation or schema; raw student ID no longer determines the query's school. [Contract and remaining coverage](../features/student-academic-overview.md), ADR-0045.

## Global search RPCs — implemented, untested (2026-09-08)

- `search.scope`: authenticated read-only current search identity/module/role policy for local navigation and record query keys.
- `search.global`: authenticated, identity- and policy-bound fuzzy category search. The previous query/limit-only contract is no longer accepted; dashboard caller now supplies the authoritative scope. Each request repeats stored session/account/school/academic checks before data reads.
- Router schemas and API mapping are separated from DB-owned SQL/context. No new HTTP mutation, schema change or live operation. Category permissions, cache handling and deferred checks are recorded in [global search](../features/global-search.md) and ADR-0044.

## Notification feed RPCs (implemented, untested)

`notifications.list`, `unreadCount`, `markRead` and `markAllRead` use protected procedures, account-owned school resolution, explicit current module/type/role policy, and DB-owned recipient predicates. Every call requires displayed `{ schoolId, userId, accessKey }`; the server rejects identity mismatches (`FORBIDDEN`) and stale recomputed access signatures (`CONFLICT`). List/count do not create contacts. Single read updates return only ID/read state; hidden IDs are not found. All-read changes only currently available owned records. Shared page/bell/mobile badge hooks key queries by this scope and invalidate the submitted scope after mutations settle. Email delivery checks and all verification remain pending; see ADR-0027 and the notification feature document.

## Scoped AI history (implemented, untested)

- Conversation list/detail and analytics GETs require live enabled AI scope and a valid conversation tool-access envelope before reading content. Unclassified legacy or currently disallowed history is withheld, not deleted. Analytics considers only permitted conversations and linked feedback.
- Conversation POST validates bounded title/locale and records current tool scope. Chat POST extends permitted scope before model history/generation and persists server-generated transcript on completion. Old browser assistant/system message POST returns 405 without writes. UI offers New chat and a legacy-preservation notice. See ADR-0026; no runtime tests run.

## AI mutation recovery (implemented, untested)

- `GET /api/chat/runs/[runId]/receipts`: live authenticated Admin/AI scope, owner/school run lookup, current AI-capability/module-filtered committed mutation receipts. Returns run identity/status and versioned completed outputs only; excludes inputs/tokens, uses private/no-store, returns 404 for inaccessible/missing run. It is read-only and does not retry mutations. Receipt availability depends on current tool access; an empty result does not prove rollback. See CORE-002 and ADR-0025.

## Tenant module configuration (implementation in progress)

- `schoolSettings.getModules`: authenticated, account-scoped read of configuration and resolved effective access; explicit `{ schoolId }` must match active-school context and scopes client cache keys.
- `schoolSettings.updateModules`: school-admin enabled-set update within granted entitlements, with revision conflict handling and displayed-school/context matching.
- `schoolSettings.getModulesForSchool`, `initializeModulesForSchool`, and `updateModuleEntitlementsForSchool`: explicit school target behind configured platform-admin middleware.
- Local schema is available; production push awaits interactive confirmation. Settings and fail-closed navigation are implemented. Primary domain routers, public assessment token services, school-site admissions and the two import workers have module checks; legacy/mixed-service/dashboard-action/HTTP paths remain unfinished. Explicit provisioning is required before guarded operations become usable.
- School-site `/enroll/[code]`, `submitEnrollmentApplication` and `/api/pdf/admission-letter` require Admissions after enrollment capability resolution. `requestParentSetupEmail` and `confirmParentSetup` additionally require Parent Portal and use a recorded-email, one-use challenge; the unsafe `setupEnrollmentParentPassword` action was removed. `/enroll/[code]/parent-setup` renders the read-only token confirmation form; only submission consumes the challenge. Public website admission listing data is gated independently of the enrollment page. PDF policy denial is 403, missing approved application/code capability is 404. All verification is deferred.

- `schoolSettings.getInstitution`: authenticated, account-scoped active-school classification read.
- `schoolSettings.updateInstitution`: authenticated school-admin classification update; ownership is part of the database write predicate.
- `schoolSettings.getInstitutionForSchool` and `schoolSettings.updateInstitutionForSchool`: configured platform-admin-only operations with an explicit `schoolId`.
- These procedures manage classification only; module controls remain CORE-002 work. Implementation is written; runtime verification is deferred.

# Dashboard domain HTTP and legacy action boundaries — implementation written

- `/api/pdf/result`: Reports + Admin/Registrar/Teacher; 1–200 deduplicated requested IDs, school-owned term/student/classroom queries and protected report API. Missing/unauthorized IDs reject the batch, not silently yield a subset. Session/module denial maps to 401/403; missing records to 404. Payment-receipt PDF remains the existing explicit 503 stub.
- `/api/chat` and conversation/message/analytics/feedback routes require authenticated school ownership, exact released Admin role and AI_ASSISTANT. `/api/chat/settings` retains authenticated Admin recovery when the module is disabled. This is the HTTP master gate, not completion of per-tool domain policy.
- Guarded legacy actions include academic-session/subject creation, classroom-department deletion/grade updates, student deletion/list/name-gender lookup, staff deletion, term-list and classroom/staff cache wrappers. The canonical remaining-action list is in CORE-002. All behavioral verification remains deferred.

# Platform QA maintenance

- `qaMaintenance.candidates`, `adopt`, `preview`, `start`, and `run` are
  platform-admin-only tRPC operations.

# Student directory

- `students.index` is an authenticated infinite query for the tenant-scoped
  student directory.
- `students.filters` is an authenticated query returning status, linked enrolled
  session/term, enrollment-date, and stable classroom-department filter options.
- `students.bulkChangeClass` is an authenticated, management-role mutation that
  moves selected term forms and linked session forms in one transaction.
- `students.bulkDeleteTermSheets` is an authenticated, management-role mutation
  that soft-deletes selected tenant-owned term enrollments.
- `students.setAdmissionType` and `students.bulkSetAdmissionType` are
  authenticated management mutations that update tenant-owned term forms and
  reconcile targeted fees.
- `students.analytics` accepts an optional `sessionTermId` and returns
  term-form-derived new-admission, returning, and unclassified counts.
- All procedures in `studentsRouter`, including overview, duplicate, import, and
  term-form detail operations, now require an authenticated caller.

## Logly ingest proxy (2026-09-07)

- `POST /api/analytics`: browser telemetry for `schoolclerk-web`, served by dashboard, marketing and school-site.
- Privacy, origin/credential selection and retry contract: [Logly analytics](../features/logly-analytics.md). No business API or database change.
# Signup email confirmation — 2026-09-08

- Legacy `/sign-up/success` is now a neutral informational route, not a query-driven signup receipt. It renders no caller-selected URL or success/delivery claim. No new mutation endpoint. Unused private legacy auth source was removed, leaving supported Better Auth/dedicated endpoints unchanged (ADR-0043).

- Signup response adds per-effect `setupStatus` and the UI shows explicit completion/sign-in. URL preflight occurs before account creation. Subdomain availability shares the creation collision helper including archived records. Vercel domain utilities are no longer exported server-action endpoints; only server-side signup orchestration calls them with freshly checked scope. See ADR-0042.

- School registration's `createSaasProfileAction` now delegates atomic account/school/attached-owner/credential creation to auth/DB packages. Existing tenant-login URL response remains; signup itself issues no session cookie. Generic Better Auth `POST /api/auth/sign-up/email` is disabled. No staff/parent registration path was replaced. See ADR-0041; tests and external consumer rollout remain pending.

- `resendSignupVerificationAction` is an explicit signed-in owner-only action on the confirmation surface, linked from onboarding welcome. No client-selected email/user/school; fresh stored-session/school/account/owner checks and a per-user 60-second cooldown guard issuance. Response states distinguish provider acceptance, console-only delivery, cooldown, verified, sign-in required and unavailable. No secret is returned.

- Dashboard `/verify-email` GET is presentation-only. The explicit `verifySignupEmailAction` server action accepts a bounded one-use token and derives request-school context; the auth/DB service atomically verifies the bound current email and consumes the proof. No automatic sign-in. Responses disclose only verified/unavailable state. See ADR-0040 and API contracts; all tests deferred.

## Teacher student registration review — 2026-09-27

- `students.submitClassStudent` creates a pending student term record in an
  authorized classroom.
- `students.classStudentRequests` lists tenant submissions for review.
- `students.classStudentMatches` suggests same-school historical identities.
- `students.reviewClassStudent` approves, matches, or rejects a pending request.

## Partial attendance writes — 2026-10-05

`attendance.takeAttendance` and `attendance.updateAttendanceSession` now permit partial registers with at least one marked student. Existing Attendance module, role, teacher access, active-term write, roster membership, duplicate and idempotency checks remain. No endpoint or response shape was added.

## Student registration Finance boundary — 2026-10-05

Student registration and `academics.entrollStudentToTerm` require live Student Management and Academics access for classroom enrollment. Finance is optional for ordinary enrollment: automatic fees run only when live effective Finance is enabled. Registration rejects optional-fee/payment entries when Finance is disabled. Finance-enabled preview/payment authorization, tenant/class/session/term ownership, open-term checks and transactional validation remain required. The client uses school-scoped module policy to hide financial controls and block unavailable policy; server transaction checks are authoritative. See ADR-0065. No schema change.

## Internal regional tenant routing — 2026-10-06

`POST /api/internal/tenant-routing` is a private nodejs/iad1 facade for the existing dashboard entry policy. It accepts signed original request metadata, validates proof before DB work, then returns a signed next/rewrite/redirect decision. Unsigned/stale/tampered/oversized requests return 403; resolution failure returns 503. Neither result is cacheable. This endpoint does not accept school mutations or grant bearer authority. ADR-0069.
