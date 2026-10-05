# ADR-0038: Authorized workspace cookie resolution

Date: 2026-09-08
Status: Implementation written; verification deferred

## Context

Dashboard actions and the proxy maintained different school/session/term selection implementations. `getAuthCookie` returned raw stored context without a live auth session and skipped ownership checks when cookie token/user matched. `resetCookie` trusted submitted token/user values before sufficient ownership checks, and `switchSessionTerm` copied submitted IDs/titles without validating school ancestry. Proxy recovery could trust a usable-looking cookie and restore persistence for a non-remembered login.

## Decision

Keep Better Auth identity separate from workspace preference cookies. Following the inspected Midday `verify-otp-action.ts` session-before-cookie pattern, apps own request/cookie orchestration and DB owns reusable authorization/academic selection. Add `packages/db/src/tenant-workspace.ts` and a dashboard-local server-only cookie parser/options utility; remove the duplicated action/proxy query and date-selection code. No new provider, schema, dependency or tenant URL topology.

- Resolve an unexpired, nondeleted stored token and matching active user with an active, non-purging account. Resolve the tenant slug to its active school; require account equality and repeat live-session/account membership in the school query. Accountless platform roles do not grant implicit school membership.
- Read sessions only through that school, and terms only through those sessions with matching term `schoolId`. Stored cookie IDs are preferences, not identity or ownership. Prefer an eligible selected term/session, otherwise the school's valid active-term pointer, then deterministic newest-session/current-dated-term/newest-term defaults. No active pointer is changed.
- Rebuild all returned IDs/titles from DB records; never spread raw cookie values or retain stale titles. A cookie's prior selections are considered only when domain/token/user match; another school's selection is discarded.
- `getAuthCookie` always resolves from signed Better Auth identity; no live session means empty context with no bearer, user, school or academic selectors. Missing/deleted/purging/mismatched workspace also returns empty context.
- `resetCookie` bounds supplied token/user and validates their stored bearer/session ownership. This supports the existing server-action sign-in that has just issued cookies while the incoming request may still carry an older session. The action sets only a workspace preference cookie, never a Better Auth identity cookie. Ineligible reset clears that scoped workspace cookie and returns empty context.
- `switchSessionTerm` requires a signed-in workspace, bounds selection inputs and rejects foreign/deleted IDs and inconsistent session/term pairs before writing. Caller titles are ignored. A session with no terms can be selected; the legacy creation action now passes its created session ID, not an undefined term ID.
- Proxy always resolves workspace ownership for authenticated requests. Invalid stored cookies are removed from forwarded request headers and expired on responses. Only canonical rebuilt cookies are forwarded; unchanged values are not needlessly rewritten. Remembered preference is preserved, unknown recovery defaults to nonpersistent, and workspace cookies are Secure/HttpOnly/SameSite=Lax on the required HTTPS stack.

## Limits

These are point-in-time context checks, not transaction locks across subsequent domain writes. Module/role/record authorization remains necessary at domain boundaries. Context selection does not activate a term, grant a module or change staff assignments. Existing same-account school membership policy is retained. Custom-domain verification, redirect normalization, signup/generic auth mutations and direct API/legacy entrypoints remain separate audit work. Previously issued data or in-flight requests are not recalled. Additional DB reads are intentional; no shared cross-request authorization cache is introduced.

No actual user cookies, sessions, records, domains or database schema were changed by the agent. No deploy, dev server, provider operation or commit.

## Deferred verification

After user resumes: forged/stale cookies; absent/revoked/expired signed sessions; wrong token/user/account; deleted/purging schools/accounts; same-account school changes; foreign/deleted session/term IDs and mismatched term ancestry; spoofed titles; empty/no-term schools; active pointer/default selection; post-create session switching; public/shared/login routes; response/request cookie removal; remember-me lifetime; Secure cookies through actual HTTPS Portless; login/term switching on mobile, keyboard and desktop. Run focused tests, types and builds then. Source inspection is not behavioral proof.
