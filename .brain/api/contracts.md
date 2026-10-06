# Institution configuration contract

## Import reference and bounded preview — implemented, untested (2026-09-22)

`getStudentImportReference` exposes `{scope, names, classDepartments, students, sessionTermId, schoolSessionId}` with canonical fields, validated flattened academic metadata and `historyNeedsReview`. Scope contains school/user/login-session/session/term IDs, not bearer tokens. Preview now also returns scope; match metadata may flag history requiring review. Multiple exact-name candidates are suggestions, not an arbitrary full match. Preview accepts 1–500 unique nonnegative integer line numbers, names/IDs up to 200 characters, original lines up to 2,000 characters and Male/Female/null gender. Existing request field names are retained. ADR-0062; execution bounds and client view-scope binding are not yet implemented.

## Shared import execution contract — implemented, untested (2026-09-22)

Execution schema/result types now come from `@school-clerk/utils/student-import-schema`, with API compatibility exports and unchanged public shapes. Direct and queued execution invoke DB-owned `executeStudentImportRow`: current canonical/target authority, direct-or-parent enrollment references, unique active session parent and fee ownership are checked before commit. Valid null direct IDs are reused without repair; duplicate/foreign/archived ancestry and retained/unbound selected-term fees require review. Unchanged admission does not reprice; changed admission uses shared protected fee reconciliation. Worker processing is DB-owned with an API compatibility wrapper, not an API dependency of the Trigger task. ADR-0061; preview/read/client coverage and all verification remain open.

## Import persisted-row receipts — implemented, untested (2026-09-22)

No public request/result shape change. A queued row is executed from its locked stored payload and job scope, with matching line/action identity, and commits student/enrollment/fee changes with its terminal receipt. Repeated terminal rows are not executed again; failure recovery rereads the receipt under fresh locks before recording a failure. Old RUNNING rows fail for manual review without replay. Job snapshots preserve all terminal statuses, including FAILED/CANCELLED. Direct execution shares the transaction-local domain operation but has no persisted request receipt; separately submitted jobs are not idempotent copies. Full package extraction, deeper row integrity and scoped client remain open. ADR-0060; drain old workers before rollout and run deferred concurrency/crash/mobile/browser checks only after user resumes testing.

## Student profile/gender — implemented, untested (2026-09-08)

Basic `{id, data: {name, surname, otherName?, dob?, gender, guardian?}, viewScope?}` and gender `{id, gender, viewScope?}` share bounded ID/displayed school-user-login binding and client-safe validation. Partial guardian contacts reject; omitted means unchanged and null/all-blank fields remove only the sole active relationship. Both return `{studentId, updated, genderChanged, guardianChanged, reconciliation: [{studentTermFormId, applied, cancelled, retained}], preservedTermFormIds}`. Basic saves report updated 1; matching gender-only repeats report 0 without fee writes. Changed gender reconciles open terms only; closed academic/ledger fee history is explicitly preserved. Incomplete/ambiguous/colliding/shared-contact state and serialization changes require review. See ADR-0058; no raw charges returned and verification deferred.

## Admission classification — implemented, untested (2026-09-08)

Single `{studentTermFormId, admissionType, viewScope?}` and bulk `{studentTermFormIds, admissionType, viewScope?}` share bounded/distinct trimmed ID schemas (1–200 characters, batch 1–100). Admission type is UNCLASSIFIED/NEW_ADMISSION/RETURNING; displayed scope binds school/user/login. Both return `{updated, alreadyClassified, studentIds, termFormIds, reconciliation: [{studentTermFormId, applied, skipped, total, cancelled, retained}]}`. Updated means changed classifications; matching repeats still reconcile fees. Retained counts obsolete automatic/selected fees protected from cancellation, not balances. Raw created charges are no longer returned; the sole current dashboard caller consumes the new counts. Missing/foreign selections return NOT_FOUND; malformed/duplicate/closed/legacy-unbound/conflicting state returns CONFLICT; missing live authority returns FORBIDDEN. Whole-batch rollback, no automatic retry. See ADR-0057; verification deferred.

## Class-change destinations — implemented, untested (2026-09-08)

`students.classChangeOptions` accepts `{studentTermFormIds, viewScope?}` with 1–100 distinct trimmed IDs bounded to 200 characters and the standard displayed school/user/login binding. It derives one live owned session from all selected open-term enrollments and returns `{scope, sessionId, studentTermFormIds: sortedIds, classrooms: [{id, displayName}]}`. Missing/foreign forms return NOT_FOUND; closed/mixed-session/malformed/canonical identity selections return CONFLICT; stale identity or missing access returns FORBIDDEN. Valid empty classrooms are not an authorization failure. No counts/statistics or mutation authority is implied. Both move clients now supply scope through one hook and use this response; all verification remains deferred (ADR-0056).

## Class-change transaction — implemented, untested (2026-09-08)

Single `{studentTermFormId, classroomDepartmentId}` and bulk `{studentTermFormIds, classroomDepartmentId}` add optional school/user/login `viewScope`. IDs are trimmed and bounded to 1–200 characters; bulk requires 1–100 distinct forms, with no silent deduplication. Both return `{count, alreadyInClass, studentIds, termFormIds, sessionFormCount, classroomDepartmentId}`. Count is newly moved forms; matching repeats count separately and do not independently reset a session default. Every selected row must pass ownership/session/lifecycle/duplicate validation or the entire transaction fails. New moves update selected term placement and affected parent session defaults only, retaining other terms and linked histories. No automatic fee recalculation or score/attendance remapping. See ADR-0055/0056; shared client scope/invalidation is written and all verification remains pending.

## Term-detail preview — implemented, untested (2026-09-08)

`students.getTermFormDetails` now has a dedicated bounded `{id, viewScope?}` schema. Scope, if supplied, includes schoolId/userId/loginSessionId, ADMIN or REGISTRAR role and nonnegative integer moduleRevision; all values must agree with live context. Identity mismatch is FORBIDDEN, role/revision mismatch is CONFLICT, absent/archived form is NOT_FOUND and malformed ancestry is CONFLICT.

The former counts/flat-array response, including artificial fee/payment zeros, is replaced with id/owned student/formatted studentName/scope/canRemove/previewLimit and assessments/attendance/charges/allocations sections. Each is `{status: available | restricted | unavailable, count: number | null, rows}`; withheld counts are null, never zero, and rows empty. Available previews are deterministically limited to 50 with full qualifying counts. Charges/allocations use decimal amount strings and retain cancellation status; allocations show the applied portion, not whole receipts or balances. The only current consumer is migrated in the same slice. See ADR-0054; compatibility/runtime verification deferred.

## Atomic term enrollment removal — implemented, untested (2026-09-08)

Single removal retains `{ id }`; bulk retains `{ ids }` with 1–100 distinct trimmed IDs of 1–200 characters. Both add optional live-checked `viewScope { schoolId, userId, loginSessionId }` and return `{ count, alreadyDeleted, studentIds }` for newly archived rows, valid previously archived rows and validated owned canonical student IDs. Every requested record must pass ownership/session ancestry checks before any write; invalid batches never return partial success. Closed active terms, malformed links, stale scope and serialization changes return CONFLICT; missing/foreign requested forms return NOT_FOUND. Canonical/session and financial/assessment records remain unchanged. The shared dashboard hook supplies scope, rejects incomplete/bounded selections, invalidates owned returned students/submitted terms and related query families, and fences local callbacks to the originating view. See ADR-0052/0053; all verification remains open, and ADR-0054 implements the separate term-detail read boundary.

## Student soft deletion — implemented, untested (2026-09-08)

`students.deleteStudent` and the dashboard delete action share `deleteStudentSchema`: bounded 1–200 character studentId and optional `viewScope { schoolId, userId, loginSessionId }`. Scope must match current stored authorization. Both return `{ status: deleted | already-deleted, studentId }`; the latter requires no active academic remnants. Missing/foreign student is NOT_FOUND; stale scope, contradictory ownership, partial archived state or serialization conflict is CONFLICT. No automatic retry. Canonical and applicable academic soft deletes are atomic; financial/assessment/guardian history is retained and balances are not cancelled. See ADR-0051; all behavioral verification deferred.

## Legacy migration availability — contained, unverified (2026-09-08)

Legacy `/migration` handlers no longer execute their historical data/cache/cookie logic: a server-only ownership-required gate rejects before effects. The protected page renders a fixed notice and directory link without reading historical records. Existing signatures/source remain for future approved migration, but no successful empty/no-op response is returned. The current `students.createStudent` RPC and reviewed-import contracts remain separate. No schema/data change. See ADR-0050; owner mapping and all runtime/mobile checks remain pending.

## Student registration — implemented, untested (2026-09-08)

`students.createStudent` revalidates bounded shared input in its direct service. Optional `submissionScope { schoolId, userId, loginSessionId, schoolSessionId, sessionTermId }` must match live identity and selected academic context; mismatch returns CONFLICT. IDs are 1–128 characters, names at most 200, term references at most 24, fee arrays at most 100; payment amounts must be finite/nonnegative. Duplicate terms/optional IDs and nonempty legacy `fees` are rejected. No class means canonical-only registration, not incomplete academic rows; explicit enrollment/fee requests require a class. Initial-term fee behavior and student/fee-summary response envelopes remain. Archived or mismatched guardians are not adopted. P2034/P2002 produce refresh/directory guidance, never automatic retries. See ADR-0049; verification deferred.

## Student fee preview — implemented, untested (2026-09-08)

The fee-preview schema bounds term/classroom IDs to 1–200 characters, preserves admission/gender enums and adds optional bounded `viewScope { schoolId, userId, loginSessionId }`. Supplied scope must match current stored authorization before fee reads. Missing/foreign term or classroom now returns NOT_FOUND (not `[]`); closed term returns CONFLICT; unauthorized scope/modules return FORBIDDEN. A valid result retains feeHistoryId/title/amount/description/scope/streamName/collectable/audience fields, with deterministic ID tie-breaking. Simulated admission/gender selectors do not identify a student, authorize writes or fix a later price. See ADR-0048; all behavioral checks deferred.

## Term enrollment write contract — implemented, untested (2026-09-08)

`academics.entrollStudentToTerm` retains its name but requires bounded non-empty student/classroom/session/term IDs; optional session-form ID must belong to the same student/school/session. It returns `{ status: enrolled | already-enrolled, studentTermFormId, studentSessionFormId }`. Matching repeats reuse the valid enrollment without fee writes; conflicting or ambiguous records and serialization failures return CONFLICT with refresh guidance. New session/term forms and required fee application share one Serializable transaction. Caller input is not modified. Overview adds `capabilities.enroll`; Finance is required for this auto-fee workflow. These changes do not certify uniqueness against other write paths. See ADR-0047 and student academic overview; all checks remain deferred.

## Student history integrity and view scope — implemented, untested (2026-09-08)

History entries add `enrollmentState: enrolled | not-enrolled | unavailable`. Duplicate/malformed references yield unavailable rather than a false absence; unknown/unmapped references conservatively prevent new-enrollment suggestions. No foreign reference IDs or counts are returned. Overview inputs optionally carry bounded `viewScope { schoolId, userId, loginSessionId }`; supplied values must match the live read context or fail FORBIDDEN before record access. `students.overview` returns `scope` for client identity agreement. Clients use normal scope-bearing query inputs and student-ID invalidation; omission never bypasses the existing authorization. ADR-0046 documents point-in-time read limits and deferred checks.

## Student academic reads — implemented, untested (2026-09-08)

Student overview and academic overview accept 1–200 character `studentId` plus optional nullable bounded `termSheetId`/`termId`. History accepts the same bounded student ID. All use one active-school guarded read; explicit selectors must agree with the student's valid school-owned history or return NOT_FOUND. Response envelopes are preserved; academic-overview student summary now comes from the same historical snapshot rather than a separate directory lookup. Default selection is the first valid enrolled term ordered by descending end date and ID. Duplicate term forms withhold links; missing-term fallback requires a unique same-session placement and never synthesizes a sheet ID. See [student academic overview](../features/student-academic-overview.md) and ADR-0045. Compatibility, cache and error recovery checks remain deferred.

## Global search scope contract — implemented, untested (2026-09-08)

`search.scope` accepts bounded `schoolId`, `userId`, `loginSessionId` and nullable academic `sessionId`. These cache bindings must match authenticated context and stored active session/account/school ownership; they are not credentials. It returns the bound identity, live role, effective modules, category policy and role/module/revision `accessKey`. `search.global` requires the same identity plus that signature, trimmed query (maximum 100) and integer limit 1–20 (default 8). Stale policy returns CONFLICT; invalid workspace/ownership returns FORBIDDEN. Record authorization and SQL use one RepeatableRead snapshot; query under two characters returns no records only after authorization. Category DTOs retain id/type/group/title/subtitle/href/rank; unauthorized classroom counts are omitted from the subtitle and student-tab link. [Search feature](../features/global-search.md), ADR-0044. Tests and client/server coordinated rollout remain deferred.

## Retired legacy auth contracts — implemented, untested (2026-09-08)

- `/sign-up/success` no longer accepts query-string values as a success receipt or navigation targets; it presents neutral recovery guidance and a fixed local signup link. No identity or delivery claim is derived from supplied parameters.
- Unexported, caller-free legacy auth utilities were removed; there is no compatibility alias for their fake-session/master-password/token behavior. Supported Better Auth/dedicated services remain. No stored token, schema or secret changes. See ADR-0043; verification remains deferred.

## Signup completion contract — implemented, untested (2026-09-08)

- Existing signup response URLs remain and are now configured HTTPS values preflighted before creation. Added `setupStatus`: domains = not-requested/submitted/needs-attention; verificationEmail = accepted/console/needs-attention; workspaceEmail = accepted/console/skipped/needs-attention; notification = created/skipped/needs-attention. Account creation can succeed while any post-commit effect needs attention. Neither submitted nor accepted proves end-user availability/delivery.
- The form shows a responsive local completion receipt and explicit tenant sign-in. No password/raw provider response/token is returned. The default password is empty; server/form bounds remain. Vercel helper exports are server-only implementation functions, not server-action endpoints.
- Subdomain availability shares the transaction's archived-inclusive school/alias lookup; it is advisory and grants no reservation. Missing/unreleased institution types and one-character slugs are unavailable. See ADR-0042; all runtime checks deferred.

## Atomic school signup — implemented, untested (2026-09-08)

- `createSaasProfileAction` preserves its form/URL response shape and current institution release gate. Auth validates canonical classification, reserved DNS slug, normalized email, 8–128 character password, 2–200 character owner/school names and bounded optional metadata. DB creates account/school/owner/canonical credential and available domain alias in one Serializable transaction. No existing identity adoption or cleanup-delete compensation; collision or transaction failure leaves no partial creation from this transaction.
- Generic Better Auth `/sign-up/email` is disabled. School signup uses the dedicated server action/service and returns the existing tenant-login handoff, without issuing an implicit session. Staff/parent services remain separate. Current provider hash and credential ID contract are retained; custom future hashing requires coordination.
- Explicit `deletedAt:{}` includes archived rows in identity/credential collision reads despite Prisma's default soft-delete filtering. Uniqueness across unrelated legacy writers is not guaranteed by this transaction alone. Post-commit external effects remain separately fallible; no live operations or tests ran. See ADR-0041.

## Signup email confirmation — implemented, untested (2026-09-08)

- `GET /verify-email?token=...` only renders confirmation; duplicate/malformed/missing tokens render unavailable state. No DB mutation or identity disclosure during rendering.
- `verifySignupEmailAction(previousState, FormData)` accepts a 64-character lowercase hex `token`, derives the request tenant and delegates to the auth transaction. Returns only `{ status: "verified" | "unavailable" }`; invalid, expired, replayed, cross-school, changed/ambiguous identities and internal failures share the unavailable response. No auth cookie, password or tenant membership is issued.
- Internal signup issuance binds current email/user/role/account/school/slug to one versioned hashed capability per user with 24-hour expiry. Exact proof consumption and conditional user verification share a Serializable transaction. Configured HTTPS links preserve proxy ports and delivery checks live eligibility after rendering. Legacy `email-verification:<uuid>` links are unsupported; use authorized reissue below. See ADR-0040.
- `resendSignupVerificationAction(previousState, FormData)` ignores client target fields and derives signed user/session and request school. Live school-matched Admin with email equal to the account's owner email can reissue its own link. Returns only `{ status: "sign_in" | "unavailable" | "verified" | "cooldown" | "accepted" | "console" }`. A per-user 60-second persisted cooldown and proof replacement share a Serializable transaction. No raw token/URL/email is returned. `accepted` means provider acceptance, not delivery; `console` means no live email. Delivery failure retains cooldown; no automatic retry.

## Auth domain and return-target contract — implemented, untested (2026-09-08)

- Standard tenant context resolves the active SchoolProfile slug/account directly. Verified custom-domain reads require live school/account relations, account equality and any stored alias-slug agreement; derive the resulting slug from the school. Auth-origin checks and dashboard use the same DB resolver. No stored record is repaired or verified automatically.
- Login `return_to`/`returnTo` accepts bounded application-relative destinations through shared `normalizeAuthReturnTo`. Unsafe absolute/network/backslash/control/encoded-separator targets fall back to role/onboarding defaults. Safe query/hash state is retained and the existing tenant URL layer applies current context.
- Password and quick-login success redirects are outside auth catches; failure URLs contain fixed messages, not raw provider/DB exceptions. No new endpoint/schema/topology. See ADR-0039; all behavioral verification is deferred.

## Authentication access — implemented, untested (2026-09-08)

- `/sign-in/email` and its server API share normalized email, bounded password and canonical identity/credential checks. Ineligible identities receive generic invalid credentials. Framework password verification/cookies/callback handling is retained, with identity/credential rechecks around issuance and exact-new-session cleanup on changed access.
- Auth session reads/listing check current DB token/user/ID, deletion, expiry and account state; cookie cache authorization is disabled. Existing accountless configured platform roles remain eligible without school membership. Ordinary unattached signup users are withheld until account attachment.
- `role` is server-owned (`input: false`), not generic signup/profile input; signup uses default `Admin`. Authorized role-management services remain separate.
- Parent phone login requires one active tenant school and one same-account Parent match; never a global fallback search.
- No schema or live-session migration. Checks are point-in-time, not atomic concurrent-write cancellation. See [ADR-0037](../decisions/ADR-0037-live-auth-session-and-password-identity.md); verification and remaining auth/domain audits are open.

## Staff setup URL contract — implemented, untested (2026-09-08)

The staff email adapter accepts only `/reset-password` and the already-authorized school's stored slug. It constructs the canonical HTTPS tenant host from existing auth configuration, preserving explicit ports; requester hosts, LAN overrides and raw app ports are not inputs. Worker payload shape is unchanged, but delivery additionally requires exact canonical origin/path and one each of onboarding/staffId/email/token, no extra parameters, credentials or fragment, and current staff/email agreement. Unsupported raw-IP/bare-localhost/preview roots fail configuration; noncanonical queued links skip and require reissue. Pure configuration now lives at utils/auth-url with existing auth/configuration re-exports. See ADR-0036; all runtime verification deferred.

## Auth origin configuration — implemented, untested (2026-09-08)

Auth initialization accepts HTTPS application origins from BETTER_AUTH_URL, then DASHBOARD_APP_URL, then environment-appropriate configured public/root host. Explicit ports are preserved; no demo hostname, HTTP/raw app-port fallback or double-scheme concatenation. Browser client targets its actual origin. Trusted origin results contain configured origins and independently verified tenant/custom-domain origins, never arbitrary request values. Explicit untrusted Origin is rejected before custom reset short-circuits; cookie-bearing HTTP mutation with no Origin needs a trusted referrer. Framework CSRF/callback checks remain enabled. Native/opaque schemes and prior hardcoded tunnels are no longer implicitly allowed. Actual HTTPS proxy and tenant routing are unverified; see ADR-0035.

## Development quick-login contract — implemented, untested

`/school-clerk/dev-quick-login` now requires bounded nonempty schoolId and userId, plus optional rememberMe. It is unavailable unless explicit local-development opt-in and loopback PostgreSQL configuration pass. The exact active school/user must belong to a non-purging QA account, with a synthetic `.test` email. Eligibility is rechecked before returning the session/cookies; a newly created unissued session is deleted on changed eligibility. Dashboard page/action enforce the same policy, and ordinary tenants expose no account picker. Old userId-only callers need coordinated updates. No environment or account classification was changed. See ADR-0034; runtime verification deferred.

## Password recovery contract — implemented, untested

Public requestPasswordReset(email) returns `{ redirectTo: null }` in every environment; no reset secret or local bypass link is returned. Valid-format unavailable identities receive the same acknowledgement. It never creates/reactivates credentials. Direct auth `/request-password-reset` also requires one eligible live identity before framework token issuance. Email delivery adds a current user/email/account/credential binding and constructs the UI URL from configured auth origin, ignoring requester callbacks/branding headers. `/reset-password` is short-circuited by the Better Auth before hook to the atomic auth/DB completion service with 8–128 character passwords. Response remains `{ status: true }`; invalid/legacy/unavailable tokens receive a generic error. Token status requires exact token plus proof; it no longer searches Verification.value and no longer distinguishes expired from otherwise invalid tokens. See ADR-0033; all runtime and routing verification deferred.

## Staff invitation identity contract — implemented, untested

Resend/copy inputs remain staffId; neither operation may choose a first matching login or reactivate archived credentials. An account-owned pending staff profile must resolve to exactly one globally unambiguous, non-deleted same-account user with canonical matching email, no other active same-account staff identity and an allowed staff role. Issuance repeats this check transactionally and creates a missing canonical credential only when no conflicting/archived row exists. Public completion and queued delivery recheck identity and credential ownership. Rejected legacy identities require account review; generic recovery is unchanged. See ADR-0032.

## Staff login editing and status contract — implemented, untested

Staff save keeps its existing form input but no longer adopts the first new/old email match. It resolves one active previous-email login in the account and rejects any other incoming-email owner (including archived users), duplicate staff targets, non-staff reuse and unsupported shared/self/external identity changes. Identity/assignment writes use one Serializable transaction. Email change preserves user ID, clears old password fields, resets verification/revokes stored sessions and requires setup; a pending role change requests a new invitation. Invitation status updates require original school/account/email and skip completed/onboarded records. Concurrent same-email resend ordering and other legacy writers remain audit work. See ADR-0030.

## Atomic staff onboarding contract — implemented, untested

`completeStaffOnboardingAction` now requires `token`, `newPassword` (8–128 characters), staff ID, email and profile fields. The auth package bounds/normalizes all values and resolves the exact latest proof/current school-account-staff-user-email-role scope before hashing and again transactionally. Dedicated `staff-password-setup:` capability and `staff-onboarding:v1:` proof are consumed with credential/profile/email-verification writes and stored-session revocation. Success remains `{ staffId, completed: true }`; missing/expired/changed/legacy proof cannot authorize a write. New tokens cannot be used through generic Better Auth reset. Definite transaction failure preserves both sides; uncertain transport failures require sign-in/check-before-repeat. Generic recovery is unchanged. See ADR-0029; all tests deferred.

## Staff invitation job contract — implemented, untested

`send-staff-invitation-email` now requires `{ deliveryId: nonempty string, ctaHref: URL }`; prior email/name-only payloads cannot pass validation. The exact URL must match the digest and staff/email/token parameters of an expiring stored binding. Names, role and recipient address come from current scoped DB records. Missing/revoked/expired bindings or denied permissions return `{ skipped: true }`; provider errors still throw for normal retry handling, using a stable delivery/route key. This does not guarantee exactly-once delivery. A successful action enqueue still means queued/PENDING, not confirmed email delivery. Producer/worker rollout must be coordinated, with old jobs reissued through authorized management actions. See ADR-0028.

## Notification feed contract — implemented, untested

- Internal `dispatchSchoolNotification` / `dispatchUserNotification` share per-recipient/per-channel live delivery checks. Result is `{ emailSent, inAppCreated, failedChannels, skipped }`, counting confirmed successes without resetting earlier deliveries on later failures; `skipped` means both success counters are zero. The former optional absolute `link` result is removed; inspected callers ignore the result. No automatic retry/idempotency or provider-commit guarantee is implied.
- In-app delivery requires registered channel, current preference, account/school/session/recipient and module/role permission inside the write transaction. Email rechecks after rendering and uses the live address; a changed school name/domain skips that rendered message. Direct dashboard and queued-worker delivery paths are not covered by this helper; deferred verification remains required.

- All four notification procedures now require `{ schoolId, userId, accessKey }`; `accessKey` is JSON serialization of the shared policy's ordered readable-type array, not a credential. The server recomputes it from current role/module configuration. Displayed school/user mismatch returns `FORBIDDEN`; stale policy returns `CONFLICT` with page-reload recovery. Clients cannot choose a different authenticated identity through input fields.
- Protected `notifications.list` additionally accepts `{ onlyUnread: boolean = false, take: integer 1..100 = 50 }`. Its rows and `unreadCount(scope)` apply the same current school/module/type/role/recipient policy before pagination/counting. Reads only look up existing contacts; unknown/unavailable types are withheld, not deleted.
- `markRead({ ...scope, notificationId })` returns only `{ id, isRead: true }`; unavailable/out-of-scope IDs return `NOT_FOUND` without content. `markAllRead(scope)` returns `{ notifications: { count }, recipients: { count } }` for scoped writes and preserves hidden rows/unread state. Null recipient status is treated as unread consistently.
- School scope must belong to the stored-session user's account. Shared API session lookups deny expired/deleted sessions and deleted users. Page/bell/mobile badge share explicitly scoped query keys and mutation invalidation; send-time authorization and all runtime verification remain pending. This is not complete end-to-end revocation. See ADR-0027.

## Module configuration contracts

- `getModules` accepts `{ schoolId }` and returns `{ schoolId, institutionType, access }`. The requested school must equal authenticated active-school scope; mismatch returns `FORBIDDEN`. The explicit input scopes frontend cache keys and never substitutes for account authorization. `access` has `status` (`configured`, `unconfigured`, `invalid`), parsed `config` or null, canonical `effectiveModules[]`, and per-module `issues[]` (`NOT_ENTITLED` or `MISSING_DEPENDENCY` with dependency IDs). Malformed stored data never grants access; missing config is distinct from an explicitly empty set.
- Stored contract v1: `{ version: 1, revision, enabledModules[], entitledModules[] }`. Arrays reject unknown/duplicate entries and are bounded by the canonical 19-module catalog. Read revisions fit a database integer; update revisions must leave room for a single increment.
- `updateModules` accepts `{ schoolId, revision, enabledModules[] }`, verifies the displayed school against authenticated active-school scope, requires a valid provisioned config and rejects selections lacking grants/dependencies. Revision mismatch or a concurrent zero-row update returns `CONFLICT`; missing/invalid configuration returns `PRECONDITION_FAILED`. A draft from another school cannot be applied even if both records happen to have the same revision.
- Platform initialization accepts `{ schoolId, enabledModules[], entitledModules[] }` and creates revision 0 once. A unique-key race returns `CONFLICT`; a school removed during scoped creation returns `NOT_FOUND`. No grant or initialization is performed merely by reading.
- Platform entitlement update accepts `{ schoolId, revision, entitledModules[] }`. Revocation removes effective access to revoked modules and their dependents while preserving the requested enabled set and all underlying records. The same revision protects entitlement and enabled-set changes from lost updates.
- School updates cannot submit entitlement fields. Platform grant authority is the current conservative implementation while the requested product-policy choice remains open; no subscription prices/bundles or onboarding grants are invented.
- Primary routers now use authenticated, account-scoped `moduleProcedure`; missing/invalid/disabled configuration returns `FORBIDDEN`. Public assessment services check the verified token's school module. Import workers recheck stored-job modules before startup/each row and preserve terminal history on replay. School-site enrollment uses code/application capability scope (not signed tokens); Admissions denial renders an unavailable page or rejects actions, and admission-letter PDFs return generic 403 after capability resolution. Parent setup additionally requires Parent Portal. This is partial coverage, not proof of all legacy/action/HTTP/mixed-service or identity-binding enforcement; see CORE-002's remaining checklist.

- Shared validation: `@school-clerk/utils/institution-config`. Updates require the strict object `{ institutionType }`; platform updates additionally require a nonempty `schoolId`. Canonical values are `PRESCHOOL`, `PRIMARY`, `SECONDARY`, `K12`, `COLLEGE`, `POLYTECHNIC`, `UNIVERSITY`, `TRAINING_CENTER`, and `RELIGIOUS_SCHOOL`.
- Reads return `{ schoolId, schoolName, institutionType, storedInstitutionType }`. The normalized classification is nullable; the stored string remains available to identify an unclassified legacy value. Trimming/case normalization, `K-12`, and legacy `vocational` are read compatibility only. Unknown values are not rewritten or classified automatically.
- Updates return `{ schoolId, institutionType }`; account/deleted-school restrictions are included in the atomic update predicate. Missing or inaccessible institutions return `NOT_FOUND` without revealing another account's classification. Missing identity/school context is `UNAUTHORIZED`; missing account membership or insufficient write role is `FORBIDDEN`.
- School-admin updates derive their school from authenticated request context and their account from the authenticated database user. Cross-account targets exist only on configured platform-admin procedures.
- No mutation of module entitlements, academic records, billing, or unreleased signup availability occurs. Runtime verification remains deferred.

# Dashboard module boundary contract

- Workspace context reconstruction (ADR-0038) now requires a live stored bearer/user, active account-owned school and school-consistent sessions/terms in both proxy and actions. Raw cookie values never grant context; absent live signed auth returns empty `getAuthCookie` selectors and credentials.
- `resetCookie` validates `{ bearerToken, userId, rememberMe? }` against storage; the existing optional `redirectUrl` remains inert. It issues only a workspace cookie, not Better Auth identity. Failure clears that scoped cookie and returns empty context.
- `switchSessionTerm` accepts a term ID or optional term/session ID pair, requires at least one ID and resolves it inside the authenticated school. Foreign/deleted/mismatched IDs reject without writing; supplied titles are ignored. Session-only selection supports no-term sessions. Proxy/action defaults are shared and use a valid active-term pointer before date/newest fallback when no eligible selection exists.
- Proxy strips invalid workspace cookies from forwarded requests and expires them in responses; remembered preference is retained and unknown recovery is nonpersistent. Cookies require HTTPS. All runtime/mobile/browser verification remains deferred.

- Workspace cookies select a school; they do not prove identity. Dashboard guards require live-session/cookie-user agreement, reload the DB user/role/account, then resolve the non-deleted school through that account. Invalid/missing/disabled modules deny domain access. Authenticated admin recovery may resolve school scope without requiring effective modules.
- Result PDF requests accept 1–200 unique term-form IDs and reject a partly missing/out-of-scope batch. Report payloads use the protected report procedure instead of a private cross-app query invocation. The underlying report query checks school-owned term/classroom/roster data and preserves teacher assignment checks.
- Legacy shared caches authorize before lookup and include school identity in their key. Mixed academic/student or staff/term projections require both relevant modules. This is partial coverage; see CORE-002 for unresolved actions, historical AI disclosure and aggregates.

# AI tool execution contract (implementation written, verification deferred)

## Conversation history scope

- New conversations record `meta.historyAccess = { version: 1, toolNames[] }`. List/detail/model-history/analytics reads require current permission for every recorded tool. Chat POST may extend the union before a new run but cannot shrink it. Missing/invalid/unknown provenance fails closed; no legacy records are deleted or automatically classified. This conservative scope includes tools that were available even if unused.
- DB transactions lock owned rows before metadata checks and content/aggregate queries. Analytics excludes feedback without a permitted conversation. Lists return a preservation notice; list/detail/analytics responses use private/no-store. History endpoints require existing enabled AI configuration, while settings recovery remains separate.
- Assistant transcripts are saved from trusted server step text/tool results. Browser `POST /api/chat/conversations/[conversationId]/messages` now returns 405; no client-provided assistant/system messages are persisted. Trusted in-flight appends can finish into a broader scope already reserved by another run; subsequent reads still require current access. SDK SSE consumption runs independently of the client via Next `after`, within hosting limits.
- New chat creates a separate scoped conversation; it does not erase old history. General activity/notifications/non-chat aggregates remain separate enforcement surfaces. See ADR-0026; all verification deferred.

- Every registered tool requires a declared capability/module policy, including AI_ASSISTANT. Tool definitions, capability lists and `availableTools` in conversation-list responses reflect current effective access. Missing/unknown policy fails closed; dashboard suggestions never fall back to unavailable operations.
- Runtime checks reload an unexpired, non-deleted stored session, actor/account/role, school modules and AI settings; captured workspace user/school/session/term must still match. Each mutation confirmation awaits another current access check. This does not atomically cancel an already-authorized database transaction.
- Signed confirmation payload v2 contains a random confirmationId, userId, schoolId, conversationId, academic sessionId/termId, toolName, actionInput, issuedAt and expiresAt (ten-minute lifetime). Unversioned/v1 payloads fail closed. A configured BETTER_AUTH_SECRET is required; no public fallback. The current authenticated request must be `workflow/confirm-tool` with identical tool/token/input, and only one matching attempt is allowed per HTTP request. Model text, legacy `confirm-payment`, and tokens merely echoed from history cannot authorize mutations.
- Preview issuance awaits creation of a namespaced, hashed `Verification` approval. Consumption verifies owned active run/conversation and deletes the exact unexpired record in the same transaction as enrollment/payment/inventory-create/inventory-issuance/assessment writes. Rollback restores approval and writes together; committed consumption denies subsequent use. Academic workspace changes invalidate the signed binding. Existing v1 approvals require fresh previews; no schema change or live data operation was performed during implementation.
- Mutation output carries `receipt: { version: 1, executionId, completedAt }`, saved with completion activity in the domain/approval transaction. All five mutation tools use this path; receipt/activity failure rolls back writes. A later failed/blocked status update cannot downgrade a completed execution.
- `GET /api/chat/runs/[runId]/receipts` returns `{ runId, conversationId, status, receipts: [{ id, toolName, completedAt, output }] }` only for the current owner/school. Live AI settings and tool/module policy restrict the DB query; only completed mutations with receipt version 1 appear. Inputs/tokens are excluded; response is private/no-store. Missing run is 404; missing current AI access is 403. No results is not evidence of rollback; clients must not auto-retry a mutation.
- Historical transcript/analytics disclosure and domain consistency need more implementation. Single-token concurrency/rollback/expiry, ambiguous commit acknowledgments, receipt recovery and separately-approved duplicates require deferred verification. Older executions are not backfilled. No runtime/browser/mobile checks have run for these contracts.

# Enrollment parent setup contract (implementation written, verification deferred)

- Request action accepts bound `code` and `applicationId`, never a replacement email/password. Sends a random 256-bit setup link only to the recorded primary-parent email. Returns status/message, never the token. Tokens expire after 30 minutes; resend is limited to once per minute per parent and replaces the prior token. Missing/console mail delivery fails instead of pretending ownership verification occurred.
- Confirmation accepts bound code/application/token plus an 8–128-character password, without trimming passwords. It revalidates stored scope, active link/application, and Admissions + Parent Portal, then consumes the hashed challenge in the same serializable transaction as account/link writes. Existing passwords/roles are not overwritten; missing credentials use the existing Better Auth hashing contract. There is no automatic sign-in or unverified phone-login grant.
- Account matching requires a single active email match in the same tenant with Parent role. Approval requires an explicit verified Parent ID and matching tenant/email. Guardian writes refuse ownership replacement and automatic claims over unrelated wards. User-facing failures are generic; historical links and general account-recovery behavior still need separate audit.

# QA purge contract

- Start requires a fresh ten-minute signed preview and exact
  `PURGE ALL QA DATA` confirmation.
- Live custom domains and unavailable file credentials block cleanup; status
  and durable receipts contain aggregate counts only.

# Academic metadata contracts

- `academics.updateSessionMetadata` lets an academic Admin rename a
  tenant-owned session and update or clear its optional start/end dates.
- `academics.updateTermMetadata` lets an academic Admin rename `DRAFT`,
  `READY`, or `ACTIVE` terms. Draft/ready metadata updates may also change or
  clear dates and an explicitly supplied note; omitting `note` preserves the
  stored note. Active-term calendar metadata is locked, and `CLOSED` term
  metadata remains immutable.
- Session and term titles are unique case-insensitively within their existing
  tenant/session scope. End dates cannot precede start dates.

# Student directory contracts

- `students.index` accepts optional `q`, `status`, `admissionTypes`, `sessionId`,
  `sessionTermId`, `enrollmentDate`, `departmentId`,
  `classroomDepartmentIds`, legacy class/title filters, `studentId`, cursor
  pagination, and a typed sort tuple.
- Explicit `sessionId` and `sessionTermId` values require an active term
  enrollment. `enrollmentDate` accepts one supported preset, one ISO calendar
  date, or an ordered inclusive ISO date range and filters
  `StudentTermForm.createdAt`. Combined period, date, classroom, and admission
  criteria match the same tenant-owned, non-deleted term form.
- Sort tuples allow only `studentName`, `gender`, `dob`, or `createdAt` followed
  by `asc` or `desc`. Page size is bounded to 1–100.
- The list returns `{ data, meta }`. Each data row includes `id`,
  `studentName`, `gender`, `dob`, `createdAt`, `department`, `departmentId`,
  `classId`, `termFormId`, `termFormSessionTermId`, `status`,
  `guardianName`, `guardianPhone`, and term-scoped `admissionType`.
- `students.bulkChangeClass` accepts at least one `studentTermFormId` plus a
  target `classroomDepartmentId` and returns `{ count }`.
- `students.bulkDeleteTermSheets` accepts at least one term-form ID and returns
  `{ count }`.
- Admission update inputs accept one or up to 100 term-form IDs plus
  `UNCLASSIFIED`, `NEW_ADMISSION`, or `RETURNING`. The mutation returns the
  number updated and fee-reconciliation summaries.
- Student creation accepts `admissionType`, `selectedOptionalFeeItemIds[]`,
  `feePayments[]` (`feeItemId`, `amount`), and shared `paymentDetails`
  (`method`, optional `reference` and `paymentDate`). Only
  audience/scope-compatible fee items can become charges or receive payments.
- Positive fee payments require payment details, may contain each fee item at
  most once, and must not exceed the matching generated charge. Required and
  selected optional fees without a payment amount remain pending.
- Student creation returns `feePaymentSummary` with `paymentIds`, `count`,
  `totalAssigned`, `totalAllocated`, and `remainingBalance`. Student, term
  enrollment, charges, payments, allocations, and ledger entries commit
  atomically.
- Finance-item input accepts `studentAudience` independently from
  `collectable`, plus `studentGenderAudience` independently from both.
- Fee preview, automatic assignment, reconciliation, configured payment
  options, and direct configured-item payments all intersect the student's
  `Male`/`Female` value with `ALL_GENDERS`, `MALE_ONLY`, or `FEMALE_ONLY`.
- `students.changeStudentGender` and gender changes through
  `students.updateStudentBasicProfile` update the canonical student and
  reconcile every complete tenant-owned term form in one transaction. Newly
  applicable required fees are created and only unpaid no-longer-applicable
  managed charges are cancelled.
- Student payment-import verification and execution enforce the same admission
  and gender audiences before suggesting, selecting, or posting a configured
  finance item.
- Finance-item create/update returns the saved item plus `reconciliation` with
  `status`, `reconciledTermForms`, `failedTermFormIds`, and `retryable`.
  Current-term batches retry once; `PARTIAL` means the fee was saved and the
  listed term forms should be retried by saving again.

## Logly telemetry (2026-09-07)

Published Logly 0.2 batch schema; only coarse `site_visit`/`page_view` events survive the package privacy projection. Missing configuration returns 503; forbidden origin 403; invalid batch 400; oversized batch 413; unavailable collector 502; collector responses retain status. Project identity is always server-selected. [Full boundary](../features/logly-analytics.md).

## Country heat-map forwarding — 2026-09-07

The shared analytics proxy forwards Vercel's `x-vercel-ip-country` as `x-logly-country` only when `VERCEL=1` and the value is an uppercase two-letter code. Logly enforces its exact ISO whitelist; invalid/missing values remain unknown. Browser-supplied `x-logly-country` and raw IP headers are not forwarded. The same edge metadata applies to independently scoped native routes where present. No body field, IP/GPS storage, user identity or consumer database change. Counts reflect the delivery network; old events remain unknown. Focused package tests and TypeScript checks pass; consumer deployment and owner-deferred live acceptance remain outstanding.
# Staff invitation generation contract (2026-09-07, untested)

Staff copy/send issuance now creates capability, latest proof and PENDING status atomically. Queue acknowledgement is not delivery confirmation. A post-issuance enqueue failure can update FAILED only under a conditional lock on the matching current proof; preflight errors do not downgrade a prior valid invitation. Direct staff in-app creation requires current proof/identity, live Admin session, account/school, recipient role/email, module and preference. Current records supply display metadata. No public input shape changed. See ADR-0031; all runtime/concurrency verification remains deferred.

## Teacher student registration review — 2026-09-27

Submission accepts classroom-department ID, term ID, name parts, and gender;
returns student/term-form IDs with `PENDING`. Review accepts term-form ID,
`APPROVED` or `REJECTED`, optional existing-student match for approval, and an
optional note. Matches include recent term titles and `alreadyInTerm` so the
reviewer can avoid duplicate enrollment. Review returns the retained term-form
ID, resulting student ID, and final status. Repeated review of a non-pending
request fails with conflict.

## Partial attendance registers — 2026-10-05

`attendance.takeAttendance` and `attendance.updateAttendanceSession` accept a nonempty `students` subset of the active classroom roster. Each row requires a unique `studentTermFormId` and explicit status (or supported legacy `isPresent`). Foreign classroom/tenant/term forms are rejected. Omitted students are unmarked, not absent. Correction replaces the active mark set with the submitted subset while retaining audit history. Duplicate-session and idempotency contracts are unchanged. See ADR-0064.

## Student registration Finance boundary — 2026-10-05

Student registration and `academics.entrollStudentToTerm` require live Student Management and Academics access for classroom enrollment. Finance is optional for ordinary enrollment: automatic fees run only when live effective Finance is enabled. Registration rejects optional-fee/payment entries when Finance is disabled. Finance-enabled preview/payment authorization, tenant/class/session/term ownership, open-term checks and transactional validation remain required. The client uses school-scoped module policy to hide financial controls and block unavailable policy; server transaction checks are authoritative. See ADR-0065. No schema change.

## Workspace profile performance — 2026-10-05

`/api/profile` keeps the canonical AuthCookie success shape and private/no-store responses. Missing identity is 401; transient resolution failure is 503, not proof of expiry. Browser concurrent reads share an in-flight promise only. No stored-session, tenant/module/record authorization change. See ADR-0068; application b8fbbcd is deployed and production verification is complete with documented regional/startup and broad-check limitations.

## Regional routing transport — 2026-10-06

Version 1 request binds UUID requestId, issuedAt, original URL/method and header tuples under purpose-separated HMAC-SHA256 derived from the existing server auth secret. Maximum request is 65,536 bytes; freshness is 30 seconds. Version 1 response carries status (200–399) and header tuples, capped at 131,072 bytes and signed with the requesting proof plus exact payload. Independent Set-Cookie entries, middleware forwarding/rewrite headers and return_to redirects are preserved. Outbound destination is a validated configured application-root origin or fixed configured custom-domain/preview origin. Proxy allows eight seconds and returns private/no-store 503 on unavailable or invalid transport. No auth/session decision is cached across requests; public API contracts are unchanged. ADR-0069.
