# Institution configuration permissions

## Import reference and matching authority — implemented, untested (2026-09-22)

Guide/reference/preview direct services require live interactive Admin/Registrar identity, same-account school and Students/Academics/Finance, with owned open session/term and ledger. Browser reference reads reject job authority. Canonical candidate names remain school-scoped; related labels require consistent active school/parent/session/term/class ancestry. Ambiguous/inconsistent history withholds those labels and requires review instead of selecting a first record. Current access is rechecked after the snapshot and matching, but later revocation cannot retract a delivered response. ADR-0062; scoped client storage/callbacks and all behavioral checks remain unfinished. ADR-0060/0061 supersede the earlier execution replay/package gaps recorded below.

## Import execution/job authority — implemented, untested (2026-09-22)

Execute/start/status require live stored Admin/Registrar session and same-account school with Students, Academics and Finance, including direct services. The public executor has no missing-user bypass. Internal workers use active persisted-job identity and recheck the current creator's role/account/school/modules before processing and within each row transaction. Target session/term/classroom ancestry and open academic/finance lifecycle are enforced before writes. Job reads are creator-and-school scoped even with explicit IDs, and reauthorize before browser token issuance; internal serialization mints no token. Existing issued provider tokens have their own expiry, not instantaneous revocation. ADR-0059; replay/claims/progress and broader row integrity remain unfinished.

## Profile/gender and guardian edits — implemented, untested (2026-09-08)

Require live stored actor/account/school, Admin/Registrar + Students and matching submitted view identity in the shared transaction. Changed gender with active enrollment references additionally requires Academics + Finance; closed academic/ledger fees are preserved. No extra modules are inferred or granted. Guardian input cannot restore archived contacts, pick between multiple links, silently rewrite another/shared/login-bound contact or attach a different login-bound parent identity. Unchanged owned contact reuse and sole-link edits remain student-management operations; linked account credentials are never changed. Shared contact editing requires a separately reviewed workflow choice. ADR-0058; point-in-time checks are not universal revocation/concurrency coverage.

## Admission classification and automatic fees — implemented, untested (2026-09-08)

Router and direct Serializable service require fresh stored actor/account/school and Admin/Registrar with Students + Academics + Finance. This preserves documented admission-management/automatic-fee authority, not general finance/payment privileges. Selected canonical/parent/term/class ancestry and closed-ledger checks precede writes. Charge ownership is validated; unbound active legacy charges require review. Student locks and existing form advisory keys coordinate known writers, with session expiry rechecked after waiting. No instantaneous revocation/global concurrency guarantee. Paid/manual/waived/allocated/ledger-linked charges cannot be cancelled by the revised helper predicate. ADR-0057; wider writers and all verification remain open.

## Class-change destination read — implemented, untested (2026-09-08)

Direct service calls and the router require fresh stored session/account/school plus Admin/Registrar and Students/Academics. Supplied view identity must agree. Validate every selected live form/parent/canonical/session/term before deriving the one source session; closed/mixed/unavailable selections fail without partial options. Return only same-school/session live classroom IDs and labels. The current picker is not a reservation or substitute for the separately guarded write. Client scope/selection checks and hidden stale options are supplemental; no instantaneous revocation claim. See ADR-0056.

## Class-change authority — implemented, untested (2026-09-08)

Live stored session/user/account/school, Admin/Registrar and Students/Academics are required in the shared Serializable move service, including direct calls. Displayed scope never chooses authority. Validate destination school/session and every selected canonical/term/parent/placement ancestry; reject closed terms, ambiguous session/enrollment identities, parent-linked ownership mismatches and normalized-name collisions before writes. Sorted canonical locks and post-wait expiry checks coordinate known writers. Finance/assessment/attendance modules are not required merely to preserve untouched history; this service cannot reprice or remap those domains. See ADR-0055; point-in-time enforcement and client safeguards are not universal lifecycle coverage.

## Term-detail sections — implemented, untested (2026-09-08)

The router and direct read service require live stored session/user/account/school with Admin/Registrar + Students/Academics. Submitted identity/role/module revision must match before records. Assessment and attendance sections additionally require their own modules; finance requires Finance and existing finance-read role intersection, hence Admin only for this management preview. Restricted domains are not queried. Owned term/canonical/parent/session/classroom ancestry is validated; inconsistent permitted-domain references withhold section counts/content rather than exposing foreign data or inventing absence. Point-in-time scope/revision checks are not instantaneous revocation or mutation authority. See ADR-0054; class-change and broader domain coverage remain open.

## Single/bulk term removal — implemented, untested (2026-09-08)

Require current stored session/user/account/school and Admin/Registrar + Students + Academics in the shared Serializable removal service. Every requested term form must match a live owned canonical student/session form and consistent live same-school academic session/term. Missing direct student IDs resolve only through the owned parent, without repair. Reject active forms in closed terms and all invalid mixed batches before writes. Sorted student locks coordinate this path with canonical deletion/enrollment; session expiry is rechecked after waiting. Financial/assessment/attendance/guardian data is not modified. See ADR-0052; this does not certify general term-detail reads, legacy writers or remaining lifecycle boundaries.

## Canonical student archive — implemented, untested (2026-09-08)

The shared deletion transaction requires a live stored actor/account/school and Admin/Registrar + Students. Active session/term rows additionally require Academics; canonical-only archive does not. Submitted student/scope IDs never establish school authority. After locking the owned canonical row, inspect scalar linked-row ownership and reject cross-school, null-school or contradictory parent/student links before writes. Do not modify finance, assessment, attendance or guardian history. Already-archived records with active remnants require review. This point-in-time policy is shared by RPC and direct dashboard action; UI gating is supplemental. See ADR-0051; runtime verification and adjacent mutation coverage remain open.

## Unowned legacy migration — contained, unverified (2026-09-08)

Live Admin plus Students/Academics/Finance grants do not prove ownership of global historical Posts datasets. The private migration gate requires those permissions and then rejects all legacy data/cookie/mutation access until an approved school binding and scoped implementation exist. The notice exposes no student records. No current workspace, supplied post/student ID, legacy cookie or static dataset grants access. Sixteen identified direct handlers are gated before work; generic post/FTD and other student mutation coverage remains open. See ADR-0050; runtime denial/isolation verification is deferred.

## Student registration write boundary — implemented, untested (2026-09-08)

Current stored session/user, active non-purging account and exact account-owned school are required inside the registration transaction. Admin/Registrar + Students can create a canonical student; class placement and automatic charges additionally require Academics + Finance. Only Admin can combine registration with receiving payments under existing role intersections. Every class/session/term/guardian reference is school-owned; closed terms, archived guardian collisions and mismatched contact details fail without restoration or shared-contact mutation. Optional submitted view identity is checked but never grants access. Scope-keyed UI gating is supplemental. This is point-in-time enforcement, not universal legacy-writer coverage; see ADR-0049 and the student directory feature. All verification deferred.

## Fee-preview direct service boundary — implemented, untested (2026-09-08)

The exported preview service revalidates stored session/account/school, Admin/Registrar and Students + Academics + Finance in the same RepeatableRead transaction as target/fee reads. Optional displayed school/user/login scope must agree. Term/session and selected classroom must be live and same-school; foreign/missing/closed targets cannot masquerade as no fees. Fee items/streams remain school-owned. Preview attributes are simulation inputs, not authority for enrollment or payment. Client ready-state gating and scoped cache masking are supplemental; write-side checks remain mandatory. See ADR-0048; verification deferred.

## Term enrollment and auto-fee boundary — implemented, untested (2026-09-08)

Enrollment requires current stored session/account/school, live Admin/Registrar and effective Students, Academics and Finance in its DB transaction. The student is locked; term/session/classroom and session-form ownership are checked, closed terms and ambiguous history rejected. A single matching existing enrollment is returned without further fee writes. Fee application and term/session creation commit together. Fee preview shares the role/module requirement; preview and shared candidate lookup constrain streams to live same-school records. No entitlement is inferred from a preview or UI capability. Serializable conflicts require refresh, not automatic retry; unrelated legacy writers and instantaneous revocation are not covered by a claimed global guarantee. ADR-0047; tests deferred.

## Student overview view-scope and integrity — implemented, untested (2026-09-08)

`viewScope`, when supplied, must agree with active school, authenticated user and stored login-session ID before the guarded academic read fetches records. IDs are cache bindings, not authorization. Minimal scalar integrity references belong to an already-authorized student and never reveal foreign content or choose another tenant. Unknown/duplicate/malformed history is unavailable, not authority to recreate enrollment. UI state gates do not replace transactional write authorization; that coverage remains unfinished. Client page/sheet/basic-editor scope agreement and loading/error masking are implemented but untested; see ADR-0046.

## Student academic management boundary — implemented, untested (2026-09-08)

Overview, academic overview and term-history reads require active stored session/user/account/school, live Admin/Registrar role and both Student Management and Academic Programs. Direct services repeat authorization in the same RepeatableRead transaction as data access. Canonical student and guardian must belong to the active school; term/session/form/classroom ancestry is checked before metadata is returned. A foreign student never selects another tenant. Duplicate/malformed links are withheld without changing stored data. Other student paths and client recovery/cache isolation remain unfinished; no broad permission-completion claim. See ADR-0045 and [feature](../features/student-academic-overview.md).

## Global search permissions — implemented, untested (2026-09-08)

- Live stored login session, current user, active account/school and optional owned academic session are required. Client IDs/signature only bind scope and do not replace bearer authorization. Accountless platform roles cannot use this search boundary to bypass school membership.
- Students: Admin/Registrar + Student Management. Staff: Admin/Teacher/HR + Staff Management. Classrooms: Admin + Academics. Classroom counts/student-tab links additionally require Student Management; counts are distinct, and joined school/session/student ancestry must agree.
- Missing/invalid module configuration or unknown roles yield no domain records. Local pages/actions are filtered through the current effective-module navigation resolver. Destination routes remain independently responsible for authorization.
- Policy mismatch rejects record access before SQL. Scope/record reads share a point-in-time RepeatableRead snapshot, not instantaneous revocation. Client hides stale/refresh/error/paused/placeholder results and refreshes mounted scope on focus/conflict/interval. No claim of verified cache/race/mobile behavior; all tests remain deferred. See ADR-0044 and [global search](../features/global-search.md).

## Staff setup destination permission — implemented, untested (2026-09-08)

Possession of a valid queued invitation binding does not authorize sending its secret to an arbitrary origin. Staff worker requires the current configured canonical HTTPS tenant destination and exact setup parameters on both delivery checks. Dashboard generation no longer trusts request hosts or detected LAN addresses. These destination checks supplement, rather than replace, existing actor/account/module/identity/proof/preference checks. No email, environment or deployment action was executed; see ADR-0036.

## Auth origin permission — implemented, untested (2026-09-08)

Origin headers and request URLs are candidates, not authority. Configured HTTPS roots are trusted directly; tenant origins additionally require matching scheme/port/root and an unambiguous active school in a non-purging account. A custom hostname requires a verified, non-deleted domain with matching active school/account ownership and HTTPS default port. DB failures do not grant trust. Explicit foreign Origin is rejected even through server auth API hooks; custom recovery cannot short-circuit that check. Existing framework CSRF protections remain enabled. General session/account authorization is still required independently; this is not tenant data access permission. See ADR-0035.

## Development quick-login permission — implemented, untested

NODE_ENV alone is no longer authority for passwordless login. The auth-owned server gate requires explicit opt-in, development runtime, local DB mode and loopback PostgreSQL host; DB queries additionally require an active `.test` user in the exact school of an existing non-purging QA account. Page visibility cannot bypass the direct endpoint guard. Recheck after session creation before cookies, discarding an unissued session on denial. No normal/hosted account adoption, env changes or live sessions. Broader origin validation and legacy auth remain unfinished; see ADR-0034.

## Password recovery boundary — implemented, untested

Email possession must be proven through a newly bound emailed reset capability in every environment. No public local reset-link bypass, first-match identity selection, credential creation/revival or pending-staff onboarding bypass is permitted. Eligibility requires a globally unambiguous canonical live user, active/non-purging account and canonical existing credential. New staff use the dedicated invitation flow. Direct request, email delivery, token-status and reset completion share these checks; successful completion consumes token/proof with password replacement and stored-session revocation transactionally. Recovery needs no enabled operational module. Other cached-session/quick-login/legacy passwordless and trusted-origin boundaries remain open; see ADR-0033.

## Staff invitation identity follow-up — implemented, untested

Staff invitation authority does not permit selecting among duplicate users, adopting another account, mutating a shared staff login or reviving an archived credential. Resend/copy/proof issuance and public/worker consumers use shared DB identity checks; dashboard/auth/jobs retain explicit STAFF_ROLES validation. Canonical credential ownership requires both userId and provider accountId to match, with exactly one active row and no conflicting archived rows. No automatic legacy normalization, merge, revival or generic-recovery change. See ADR-0032; runtime/role/tenant/race verification is deferred.

## Staff identity collision guard — implemented, untested

Admin staff editing is not implicit account-merge authority. Existing login selection is deterministic from the previous staff email within the current account; the incoming email may not belong to any other login, including archived records. Parent/non-staff accounts cannot be converted, new staff cannot adopt an existing login, and shared-profile/self-admin/external-provider identity changes require explicit review. Current Admin/module authority is rechecked for status callbacks, whose DB predicates retain original school/account/email and exclude ACTIVE/onboarded records. Email/role changes soft-revoke stored sessions; general cached-session/legacy-token enforcement remains separate. See ADR-0030.

## Staff onboarding proof — implemented, untested

New public staff completion requires possession of the current dedicated invitation capability and matching proof bound to staff/user/school/account/email/role. ID/email alone is rejected. Live Staff module, non-deleted/non-purging ownership, pending staff and one credential are rechecked inside a serializable transaction. Both capabilities are consumed atomically with password/profile/exact-user verification writes and stored-session soft revocation. Generic password reset cannot consume new staff setup tokens. Old generic tokens and cached-session consumers still need rollout audit; no live revocation was performed. See ADR-0029.

## Staff invitation management and worker boundary — untested

Dashboard save/resend/copy actions now require live Admin + Staff module and account-owned active school/session/term. Save additionally requires Academics before assignment writes. Worker authority comes from an expiring stored invitation binding, not browser cookies or raw queued email/name fields. It rechecks current Admin actor, staff/user/account/email/role, tenant slug, active reset token, email preference and Staff module before each send. This does not yet fix the public staff completion action's missing identity proof, direct in-app/status writes or email-collision behavior; these remain release blockers. See ADR-0028.

## Notification feed access (implemented, untested)

- API delivery helpers now independently recheck current actor session/account, active non-purging account-owned school, recipient membership/audience role, type/module access and per-channel preference for each recipient/channel. In-app checks and creation share a transaction; email rechecks after rendering immediately before provider invocation. This does not cover direct dashboard signup/staff writes or queued staff invitation jobs; no atomic external-send revocation or retry guarantee is claimed.
- Shared API session predicates require future expiry, non-deleted session and non-deleted user. Notification context additionally rejects missing/purging accounts and schools outside the signed-in account. This shared-session change affects other API callers too; their expiry/auth fixtures require deferred verification.
- Feed list/count/read/all-read intersect active recipient or legacy user ownership with current school and explicit notification type policy. Students + Billing gate student finance; Staff + Billing gate payroll; Billing gates service finance; Assessments gate assessment notices; Staff gates invitations. Current finance roles are Admin/Accountant, payroll adds HR, assessment-request audience is Admin. Signup success remains a recovery notice. Unknown types fail closed. No new role grants or history deletion.
- All notification reads/writes require displayed school/user/allowed-type signature and reject disagreement with live authenticated scope before feed/status access. Shared client query keys include these selectors; no selector grants permission. Page/bell/mobile counts suppress cached results during context mismatch, pending refetch or failure. Send-time recipient/module rechecks and generic Activity reads remain unfinished. This boundary does not cancel in-flight authorized work or retract delivered data. See ADR-0027.

## Tenant module settings

- Module reads and school-admin enabled-set changes reuse the same authenticated account/school ownership scope as institution classification. A role or school header alone is insufficient.
- Enabled-set changes require `Admin`/`ADMIN`, validate against stored entitlements and dependencies, and use an atomic expected-revision write scoped through the non-deleted school/account relation.
- Normal module reads and writes also compare explicit requested `schoolId` with authenticated active-school context. This is a cache/draft identity safeguard, not permission to select arbitrary accounts. School switch mismatch returns `FORBIDDEN` before accessing configuration.
- Explicit initialization and entitlement changes are exposed only with configured platform-admin middleware. Normal school-admin requests cannot add entitlement fields or grant themselves modules.
- `moduleProcedure` now authenticates and verifies active school/account ownership plus effective modules before primary student, academic, classroom, subject, assessment/report, attendance, finance, staff, inventory, parent, admission/enrollment, question and filter handlers. Missing/invalid/disabled policy returns `FORBIDDEN`; read failures never fall back to access. Settings/auth/provisioning remain outside domain gating.
- Inventory additionally requires Admin/Accountant. Student-specific finance operations require finance plus student management; report/print-history operations require results/report access. Existing deeper role and target-record guards remain mandatory.
- Public assessment token resolution verifies signature/hash before checking the resolved school's assessment module. Manager-authorized reject/revoke stays available for safe cleanup. Import processors check stored-job scope at startup and before each row; terminal replay preserves completion history.
- Public enrollment page/submission/uploads/letter PDFs require Admissions using the school resolved from the code/application pair. Enrollment parent-login setup additionally requires Parent Portal. Website admission listings use the resolved website tenant; policy denial suppresses links and counts, including template fallback links. General login/reset recovery routes are unchanged.
- Enrollment parent setup now requires a single-use emailed identity proof bound to the recorded parent/application/tenant/email before account creation/linking. Existing passwords are retained, unverified phones do not establish login ownership, and guardian writes cannot replace another user or claim unrelated wards. Approval uses explicit verified Parent IDs instead of phone/email inference. The old direct reset-token action is removed; historical links still need audit.
- Dashboard domain boundaries now have `requireDashboardModules`: a live session must agree with the workspace cookie's user, then a current DB user/account/role and account-owned school are resolved before module checks. Result PDF requires Reports and Admin/Registrar/Teacher; its report API retains teacher-assignment authorization and school-owned term/classroom checks.
- Selected legacy academic/student/staff actions enforce modules/roles and school-scoped writes at their exported helper, not only at wrapper/UI level. Administrative legacy classroom/student lists are Admin/Registrar-only. Cache wrappers authorize before lookup and key by school; auth-dependent student actions are not shared-cache callbacks.
- Chat HTTP requires the current exact Admin release role, account ownership and AI_ASSISTANT. Admin settings recovery is intentionally independent of AI module activation. Feedback IDs must belong to the same school/user; supplied run and conversation IDs must agree. Per-tool policy/filtering/live checks and versioned history-envelope checks are implemented; general activity/non-chat aggregate disclosure remains unfinished.
- Conversation prose/title/preview/model-history/analytics requires all tools in its recorded conservative envelope under current role/config/module permissions. Legacy/invalid metadata never grants access. Owned row locks protect metadata checks and subsequent content reads from concurrent scope expansion. Browser assistant/system transcript writes are retired; server completion owns persistence. No records were backfilled/deleted. See ADR-0026; verification remains deferred.
- Run receipt recovery additionally checks current enabled AI config/capabilities and restricts queried tool names to effective module permissions. The run/conversation and receipt must match the same school/user; only committed versioned mutation outputs are returned, never input/token fields. Mutation result/activity writes occur inside the same transaction as domain changes and approval consumption. Receipt reads do not grant replay authority or restore disabled-module access; behavioral verification remains deferred.
- Complete enforcement remains unfinished: legacy FTD/global posts, dashboard actions, dashboard PDF/chat/tools, mixed-domain side effects and aggregate reads remain on CORE-002's coverage checklist. Public identity-proof behavior and revocation timing need verification; general auth recovery remains a separate audit surface. Module checks do not replace role/record authorization. All behavioral verification is deferred.

- Reading the active institution requires a signed-in user with `saasAccountId` matching the non-deleted school's `accountId`; a supplied `x-ttss-id` school identifier alone is never sufficient. Non-admin members can read but cannot write.
- Updating classification additionally requires `Admin` or `ADMIN`. The school ID, account ID, and `deletedAt: null` stay in the update predicate; ownership is not merely checked before an unscoped write.
- Explicit cross-account read/write procedures use `platformAdminProcedure` and its configured platform roles, never the ordinary school-admin role by itself. Classification does not grant module permissions or billing entitlements.
- Final role/cross-tenant rejection tests are pending the user-resumed verification phase.

# QA maintenance permissions

- Only configured platform-admin roles can discover/adopt QA accounts or
  operate purge runs.
- Purging accounts have sessions revoked and cannot use authenticated school
  APIs.

# Student directory permissions

- Student creation and term enrollment reject missing school context before issuing tenant-dependent writes. Import execution captures validated school/session/term IDs before transaction callbacks; request-context identifiers are explicitly optional strings, not untyped values.
- Every `studentsRouter` operation requires authentication.
- Student reads derive `schoolProfileId` from the authenticated workspace and
  exclude soft-deleted canonical students.
- Term-form detail reads also require the term form and student to belong to the
  active school and be non-deleted.
- Student deletion, term-enrollment deletion, gender changes, class changes,
  admission-status changes, and bulk class/term actions require `ADMIN`,
  `Admin`, or `Registrar`.
- Target classroom departments and selected student term forms are verified
  against the same tenant before a class move is committed.
- Registrar navigation may expose Enrollment and Student Directory because the
  existing authenticated student-management contract already includes
  `Registrar`. This navigation exposure does not replace or broaden server-side
  checks.
- Student creation remains available through its existing authenticated
  contract, but including a positive `feePayments[]` amount additionally
  requires finance-write access (`ADMIN`, `Admin`, or `Accountant`). The same
  finance check is enforced in the transaction service, not only in the UI.

# Dashboard navigation permissions

## Session persistence and profile recovery — 2026-10-05

Remembered auth sessions now renew daily with a rolling 365-day expiry. Live stored session/account/role checks, revocation and non-remembered sessions remain enforced. `/api/profile` returns 401 when no identity remains and private/no-store for valid workspace reads. Browser tRPC context uses this HTTP read; missing identity redirects to login, while network failures do not grant access or imply expiry. See ADR-0067.

- Navigation is a discoverability layer, not an authorization boundary.
- The dashboard resolves module, section, item, and child availability by
  intersecting role, permission, institution-type, enabled-module, and status
  policies.
- Route handlers, server components, tRPC procedures, and database helpers must
  continue enforcing tenant and role authorization independently of whether a
  link is visible.
- Support resolves to header-only Notifications and Student resolves to the
  explicit unavailable page; neither role falls through to an Admin or Teacher
  default.
# Staff invitation direct delivery follow-up (2026-09-07, untested)

Direct staff in-app writes now reauthorize inside the notification transaction using the verified server session ID, current Admin role, account-owned active school, pending staff proof and matching recipient email/role, Staff module access and in-app preference. Exact-proof row locking orders this side effect with superseding issuance/consumption, not global authorization revocation. Late queue-failure status also requires that proof and scoped pending staff. See ADR-0031; legacy resend/copy email ambiguity and other direct actions remain separate enforcement work.
# Live authentication authorization — 2026-09-08

- Auth origins and dashboard custom domains now share stored verification and active school/account binding checks. An alias cannot point through another account's school or disagree with a non-null canonical slug. Standard active school slugs remain resolvable independently of alias-table rows. These lookups do not replace user membership or domain-module authorization.
- Login return targets are app-relative and shared across browser/server paths; external/network/encoded-separator destinations are rejected. Embedded query fields remain the destination route's responsibility. No domain provisioning, DNS verification or permission grants occur. See ADR-0039; signup/generic auth/legacy and later runtime verification remain open.

- Workspace resolution now independently binds bearer token/user to active account and school, then session/term ancestry. Signed-in accountless platform roles do not bypass school membership. Cookie matching alone is not authorization; signed-out reads return no stored credentials/context.
- Academic switching validates IDs inside the current school and rejects inconsistent ancestry; client titles are not trusted. This changes selection only, never term activation, module grants or academic permissions. Domain operations retain their own live guards.
- `resetCookie` requires a valid stored opaque bearer and matching user, supporting newly issued same-request sign-in; it sets no Better Auth identity cookie. Proxy clears invalid workspace context and does not upgrade non-remembered persistence. See ADR-0038; custom-domain/redirect and wider auth/domain audits remain open, with testing deferred.

- Password login rejects ambiguous/archived identities and credentials, pending staff and deleted/purging accounts. Framework lookup/issuance binds the checked user and credential; failed post-create checks remove only the exact unissued session.
- Cookie-cache authorization is disabled. Per-request session adapters check stored token/user/ID, deletion, expiry and account state, then reload exposed user metadata. Existing accountless platform-role configuration is preserved; school Admin alone is not an exception.
- Generic auth profile input cannot set role; generic email signup is disabled. Dedicated school signup creates only its new attached Admin owner and credential atomically, preserving the current institution release gate. Existing stored roles need later audit; dedicated role-management authorization remains mandatory.
- Parent phone lookup requires tenant resolution and an unambiguous same-account Parent. It does not bypass passwords or grant school ownership.
- Signup, workspace-cookie ownership, legacy auth, generic account mutations, session-update races and remaining domain entrypoints stay incomplete. See [authentication feature](../features/authentication.md). No behavioral checks or live auth operations ran.
# Signup email capability boundary — implemented, untested (2026-09-08)

Legacy query-string signup success is not authority: the route now ignores supplied identity/URL fields. Unused private auth utilities with password-bypass/token behavior were removed without altering stored identities. These removals do not prove generic auth or legacy FTD ownership coverage (ADR-0043).

Post-commit signup workspace email/notification now require current active same-account school and unique canonical Admin owner identity matching recorded account owner email. Registered channels and preferences are respected; notification checks/writes share a transaction, while email rechecks after rendering. Vercel utility exports are server-only, not browser-callable actions; the sole signup caller builds configured HTTPS hosts and revalidates scope before each request. No readiness/exactly-once claim or module entitlement grant is implied (ADR-0042).

School signup provisioning now uses one Serializable transaction and no implicit session or post-hoc user attachment. Collision checks explicitly include archived identities/credentials through the shared client's soft-delete filter, including the repaired staff/recovery/platform/parent-phone/verification history reads. No existing identity can be adopted by this signup flow. Generic email-only signup is disabled; outside-repository consumers must migrate. See ADR-0041. Broader legacy writers and post-commit effects remain open.

Signup email confirmation authorizes only the email verification represented by a current, one-use school-bound proof. It grants no login session, role change, module activation or account attachment. Canonical email uniqueness includes archived collisions; user/account/school must remain live and recorded identity/role/slug must agree. POST derives school context server-side and consumes the exact proof atomically with the conditional update. GET has no side effect. Old unbound links fail closed. Self-service reissue requires live signed/stored session, same-account school, Admin role and current user email matching the account owner email; no submitted recipient/target IDs, module entitlement or accountless platform bypass. Cooldown is per user across schools. Generic Better Auth email/account endpoints remain unfinished boundaries (ADR-0040).

## Teacher student registration review — 2026-09-27

Teachers, Admins and Registrars may submit with Student Management and
Academic Programs modules, but classroom/term access is checked server-side.
Only Admins and Registrars may list requests, inspect matches, or review;
review also requires Academic Programs. Every operation scopes to the active
school. Rejected submissions remain visible for review but are excluded from
active attendance, scoring and print surfaces.

## Student registration Finance boundary — 2026-10-05

Student registration and `academics.entrollStudentToTerm` require live Student Management and Academics access for classroom enrollment. Finance is optional for ordinary enrollment: automatic fees run only when live effective Finance is enabled. Registration rejects optional-fee/payment entries when Finance is disabled. Finance-enabled preview/payment authorization, tenant/class/session/term ownership, open-term checks and transactional validation remain required. The client uses school-scoped module policy to hide financial controls and block unavailable policy; server transaction checks are authoritative. See ADR-0065. No schema change.

## Regional entry validation — 2026-10-06

Routing transport proof authenticates the internal caller only. The regional resolver still checks live Better Auth identity, stored session, account-owned school, unique domain, workspace ancestry and strict academic selection exactly as the former Proxy. Direct server actions retain the matched-route entry gate and their existing guards. Missing/invalid transport fails closed without clearing valid browser identity or synthesizing an access grant. API/tRPC/module/record permission rules are unchanged. No cross-request cached identity is introduced. ADR-0069.
