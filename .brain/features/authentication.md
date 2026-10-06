# Authentication access boundaries

Status: Implementation in progress; verification deferred by user.

## Ownership and behavior

### Rolling persistence and expiry recovery — 2026-10-05

Remembered sessions and workspace cookies now have a 365-day rolling lifetime with daily renewal. Browser session reads refresh every five minutes and on focus. Signed-out/expired protected layouts and shell session reads redirect to login; profile HTTP reads return 401 for missing identity, and tRPC uses that route rather than a server action during initial rendering. Sign-out/revocation and live stored-session checks remain intact; browser data clearing or a year without renewal still requires login. Existing expired sessions are not revived. See ADR-0067. Local classroom/navigation verification passed; production acceptance pending module adoption.

Recovery release 9448527 is Ready / Current on production dashboard domains (Vercel deployment 8WdDK9gKDcgm7hKYVz28GLW3dqPj). Local browser use renewed the stored admin session to 365 remaining days; an unsigned production request to `/academic/classes` redirected to the tenant login with its return path. Navigation tests: 23 passed; Logly tests: 8 passed. Broad typechecking retains existing site-nav/shared errors, and auth typechecking retains the database inferred-never error. Production module-dependent classroom acceptance remains pending the owner's module-adoption choice and authenticated production sign-in.

Owner-approved Daarul Hadith module adoption subsequently completed. Live authenticated production module/classroom API reads succeeded (HTTP 200, seven classrooms). Automation's browser remains unsigned in production, so no authenticated production UI claim is made.

`packages/auth/src/access.ts` owns Better Auth request adapters; `packages/db/src/auth-access.ts` owns identity, live-session and parent-phone reads. Dashboard actions orchestrate. Password verification, signed cookies and callbacks remain framework-owned. See [ADR-0037](../decisions/ADR-0037-live-auth-session-and-password-identity.md).

- Password sign-in requires unique canonical identity/credential, active account and no pending staff setup. Identity/password/role changes around session creation deny issuance and trigger exact-new-session cleanup.
- Auth session reads do not authorize from the five-minute cookie cache. Stored session/token/user/expiry and account eligibility are checked; current name/email/role/verification state is returned. Accountless platform identities retain only existing server-configured role eligibility; school Admin is not an implicit exception.
- Role is server-owned auth metadata. Signup uses default `Admin`; dedicated authorized services own later role changes.
- Parent phone lookup requires one active tenant school and one same-account Parent match. Missing tenant/ambiguous history denies lookup; password verification still follows.
- School signup now atomically creates account/school/domain (when available), attached owner and canonical credential, then hands off to ordinary tenant sign-in. No implicit signup session is issued. Generic Better Auth email-only signup is disabled (ADR-0041).

## Remaining work

### Legacy surface retirement — implementation written (2026-09-08)

The old `/sign-up/success` route ignores all query values and renders a neutral notice, not a success/delivery claim or caller-provided links. Its only action is a fixed local signup link with explicit check-before-resubmitting guidance. Current completion remains sourced from the signup action response. Responsive constrained card and touch target are written, not browser-verified.

Unused/unexported `packages/auth/src/utils.ts` was removed after checking callers and its clean Git status. No replacement fake-session/token/master-password API remains in that file; supported Better Auth and dedicated services are unchanged. Source deletion is Git-recoverable; no token/session/user records or secrets were touched. See [ADR-0043](../decisions/ADR-0043-retire-unverified-legacy-auth-surfaces.md).

Next domain coverage: global search currently queries student/staff/classroom data without per-domain module filtering or complete client identity/policy cache scoping. FTD records use a global numeric post dataset without school ownership; ownership or retirement decision has been requested before migration. Generic account mutations and other direct boundaries remain open. All verification stays deferred.

### Signup handoff and post-commit effects — implementation written (2026-09-08)

Signup preflights configured HTTPS dashboard/site/login/onboarding URLs before creating records; named local site mapping and explicit proxy ports are retained. Signup URL helpers are server-only and do not use request-host/protocol trust or default HTTP. Availability and creation share archived-inclusive school/alias collision reads and the same released-institution/minimum-slug checks.

Signup now renders a dedicated responsive completion card from the action response, with explicit sign-in instead of immediate redirect. It distinguishes processed domain requests, email provider acceptance, console/no-send, skipped and needs-attention outcomes. No inbox/DNS/certificate readiness is claimed. The shared default password was removed, password state clears after success, and the new heading receives focus. A lost response still requires sign-in/inbox checks before retry; no durable receipt/outbox is claimed.

Workspace email and notification logic moved out of the action. DB-owned current active school/account/canonical owner and preference checks gate effects; email rechecks after rendering, notification writes share a Serializable transaction. Verification retains its separate proof/reissue policy. Vercel helpers are server-only (not browser-callable actions), and scope is rechecked before each provider request. See [ADR-0042](../decisions/ADR-0042-signup-handoff-and-channel-status.md). All tests and mobile/browser checks remain deferred. Legacy success-page query inputs, provider verification/retry and broader auth/domain coverage remain open.

### Atomic school signup — implementation written (2026-09-08)

`packages/auth/src/school-signup.ts` owns bounded validation and the provider's current default password hashing. `packages/db/src/school-signup.ts` owns Serializable collision checks and all new account/school/owner/credential/domain writes. The dashboard keeps the existing institution release gate and post-commit effects, but no longer creates a school before framework signup, attaches an arbitrary returned user, or compensates with deletes. User/credential IDs follow the inspected Better Auth 1.5.5 schema. No email verification, session, module grant or existing identity is fabricated.

Collision reads include canonical SchoolProfile regardless of alias availability and case-insensitive email/slug history, including archived rows. The shared client's soft-delete default is explicitly bypassed with `deletedAt:{}` for intended history checks. The same correction applies to existing staff identity/credential/collision, password recovery, accountless-platform password identity, parent-phone and signup-verification identity reads. Deleted candidates are still rejected, never revived. Global uniqueness across all unrelated legacy writers is not proven.

Generic `/sign-up/email` is disabled; the repository's sole caller migrated to school provisioning. The UI already navigates to tenant login and continues to do so without an automatic signup cookie. Existing outside-repository generic-signup clients require migration. Metadata/password field limits now agree between form and service. See [ADR-0041](../decisions/ADR-0041-atomic-school-owner-provisioning.md).

Existing post-commit domain provisioning, workspace-ready email/notification paths, broader signup URL helpers and generic/legacy account endpoints still need their remaining audit/implementation. No outbox or live schema operation is introduced. All tests and browser/mobile verification remain deferred.

### Signup email confirmation — implementation written (2026-09-08)

New signup email links use 24-hour SHA-256-at-rest capabilities bound to the issued canonical email, user/role and live account/school/slug. A deterministic per-user Verification row supersedes previous issuance. The auth service owns validation/generation/Serializable transactions; DB helpers own live identity checks and exact proof consumption with conditional email verification. Duplicate case-insensitive identities (including archived matches), changed ownership/email/role/slug, deletion, expiry and replay deny completion. No session or account attachment is created.

The page is read-only on GET and composes a dedicated confirmation form with pending/unavailable/success states, wrapping copy and 44px full-width controls. The server action resolves request-school context; no client-submitted user/school/email determines the target. Links use the shared configured HTTPS tenant builder and delivery rechecks proof eligibility after rendering. Page metadata disables indexing/referrer forwarding. See [ADR-0040](../decisions/ADR-0040-bound-signup-email-confirmation.md).

Old unbound links are rejected, not migrated or deleted. Owners can now sign in and explicitly request a fresh link from this surface or the onboarding welcome link. The action derives user/session/school, requires live Admin access and current user email equal to account owner email, and performs reissue plus a per-user 60-second cooldown in one Serializable transaction. No email input, cross-user issuance or automatic send; legacy owner mismatches require review. Already verified owners receive no-send acknowledgement.

Initial signup and reissue share a server-only sender with current proof-backed recipient/name/slug and a post-render recheck. Recovery UI distinguishes sign-in required, unavailable, cooldown, verified, provider accepted and console-only/no-live-email states. Failed delivery keeps the cooldown; explicit retry is available after one minute. Login return targets omit old tokens. Transactional signup provisioning, generic auth email/account mutations and broader delivery/outbox/abuse policy remain unfinished. Provider delivery is not atomic with DB eligibility; no live sends, schema changes or tests were performed. Mobile responsiveness is constructed, not verified.

### Domain and login navigation — implementation written (2026-09-08)

Auth origins and dashboard lookup share active canonical school-slug and verified custom-domain resolution. Custom records must agree with live school/account ownership; optional stored alias slugs must match the school's canonical slug. Unknown/unverified/mismatched aliases deny resolution. Standard slugs remain SchoolProfile-owned, independent of alias-table availability. No DNS/provisioning changes.

Login client/server use one browser-safe app-relative return-target parser. Unsafe destinations fall back to existing role/onboarding defaults; safe query/hash state survives tenant URL adaptation. Successful server redirects occur outside auth error catches, and server error URLs no longer include arbitrary exception text. See [ADR-0039](../decisions/ADR-0039-verified-domain-and-login-return-targets.md). All browser/mobile/runtime verification remains deferred; generic callbacks and other navigation consumers are not covered by this login-specific parser.

### Workspace context — implementation written (2026-09-08)

Actions and proxy now share DB-owned live-token/user/account/school and academic-ancestry resolution. Cookie IDs are preferences; IDs/titles are reconstructed. No live signed auth means empty action context. Explicit switching rejects foreign/deleted/inconsistent IDs, while session-only selection supports newly created sessions without terms. Valid active-term pointers precede deterministic defaults when no eligible prior selection exists. No term activation occurs.

Proxy forwards only rebuilt context, removes invalid workspace cookies, and preserves nonpersistent recovery. Cookies are Secure/HttpOnly/SameSite=Lax; `resetCookie` independently validates the submitted bearer against storage for same-request login compatibility and does not issue auth identity cookies. See [ADR-0038](../decisions/ADR-0038-authorized-workspace-cookie-resolution.md).

Workspace selection is implemented, untested; domain authorization still must recheck scope. Custom-domain verification and redirect handling remain open, alongside the other auth work below.

Audit signup, generic account mutation endpoints, legacy auth, workspace-cookie ownership/redirect handling and direct domain authorization. Review existing role assignments and ambiguous identities without automatic adoption. Guards are point-in-time, not atomic cancellation; domain writes need their own current tenant/module/record checks. Accountless platform recovery is unchanged.

No UI layout change. Final user-resumed verification must cover focused auth/DB tests, typechecks, builds and mobile/browser login, recovery, onboarding, errors, redirects, expiration and keyboard flows. Implementation is not verified or released.

## Local account selection and quick sign-in — 2026-09-27

In a development process connected to the local loopback database, the tenant
login page lists active users of that school. Selecting an existing account
enables passwordless quick sign-in. This is restricted to development, the
`local` database profile, a loopback PostgreSQL host, and a loopback request
host. `SCHOOL_CLERK_ENABLE_DEV_QUICK_LOGIN=false` disables the shortcut; normal
password sign-in remains available. The server action and direct auth endpoint
recheck tenant/user eligibility before issuing a session. The Daarul Hadith
picker displayed four existing accounts, and browser QA signed in as a teacher
and an admin through this local shortcut. See [ADR-0034](../decisions/ADR-0034-local-qa-quick-login.md).

## Request performance — 2026-10-05

Server components share canonical workspace and signed-session resolution within a render only. Workspace preference mutation actions retain live independent validation. SWR and browser tRPC share concurrent `/api/profile` reads and discard the completed promise; transient failures do not imply sign-out. See ADR-0068. Deployed in application b8fbbcd and verified on the production tenant. Independent stored-session/domain reads overlap with all account/school/session/term guards unchanged; 11 concurrency/negative fixture tests pass. No cross-request identity reuse.

## Regional tenant routing — 2026-10-06

The existing tenant/auth/workspace entry policy executes inside an authenticated iad1 facade, reached by one global Proxy HTTP call. The original resolver and cookie reconstruction rules are preserved, including custom domains, public/share paths, role defaults, login return_to and server-action entry. Transport errors return retryable 503, never an expiry redirect or authorization grant. Local Chrome sign-in, seven classroom rows, dashboard counts, form open/cancel, sign-out and protected-route redirect pass. Production timing/region checks remain pending. ADR-0069.
