# ADR-0034: Local development quick login

Date: 2026-09-07
Status: Local-only extension browser-verified 2026-09-27

## Context

The previous development endpoint accepted only a user ID and denied only NODE_ENV=production. The login page listed account users for every non-production runtime. Hosted preview/development databases and ordinary tenant identities were not distinguished. Login also accepted password prefill from query parameters.

## Decision

Keep the useful local QA shortcut, but make it default-off. A shared auth-owned server gate requires NODE_ENV=development, SCHOOL_CLERK_DB_MODE=local, SCHOOL_CLERK_ENABLE_DEV_QUICK_LOGIN=true and a PostgreSQL DATABASE_URL whose hostname is exactly localhost, IPv4 loopback or IPv6 loopback. Turbo forwards the flag without setting it; no env files are changed.

Use DB-owned queries for an active school and its active `.test` users in a non-deleted/non-purging account already classified QA. The login page does not load ordinary account users. Server action and direct endpoint both recheck eligibility; endpoint payload includes schoolId and userId. After framework session creation, recheck policy and current identity/role before cookies; delete only that newly created unissued session on failed recheck.

Remove password query prefill from server props and client form/query effects, preserving typed password entry and browser autofill. QA picker copy explains its limited scope; controls have 44px minimum height and existing viewport-constrained layout. Follow Midday's established-session-before-navigation pattern and package-owned DB/auth boundaries. No new provider, table or dependencies.

## Limits and rollout

Old userId-only calls must be updated together with the endpoint. Existing ordinary local accounts no longer qualify automatically; no account is reclassified/adopted by this change. A loopback URL does not prove that a user-configured tunnel is local storage, so QA classification and synthetic email checks remain separate requirements. This is not global session-revocation or network-access control; trusted origins, configured HTTPS auth routing, general login and unused legacy auth still require coverage.

No live logins/sessions, account classifications, env edits, tests, typechecks, builds, lint, browser/mobile QA or commits. Deferred cases: every runtime/profile/flag combination, missing/malformed/nonloopback database URL, non-QA/live emails, cross-school IDs, deleted/purging accounts, eligibility change before cookies, normal password login, URL password ignored and mobile/keyboard picker behavior. CORE-002 and the full portfolio remain incomplete.

## Local account picker follow-up — 2026-09-27

The development/loopback/local-database checks also allow the login page to
list active accounts for the current school. For ordinary accounts this is an
email picker only: selecting one still requires its existing password and uses
the normal password sign-in path. The QA-only passwordless endpoint remains
default-off, `.test`-only, and limited to classified QA accounts. The local
picker is hidden outside the local development database profile and loopback
request hosts. This keeps
Darul Hadith account selection available without changing ordinary-account
authentication.

## Local-only passwordless extension — 2026-09-27

The owner explicitly approved passwordless quick sign-in for existing normal
accounts in the local development database to run Daarul Hadith QA. The shared
gate now requires development runtime, the `local` database profile, a loopback
PostgreSQL URL and a loopback request host. Explicit
`SCHOOL_CLERK_ENABLE_DEV_QUICK_LOGIN=false` opts out. The tenant account picker,
server action and direct endpoint admit active users of an active school and
non-purging account; both session paths recheck that eligibility. Hosted and
non-loopback requests remain ineligible. No account role or classification is
changed. Browser QA completed passwordless sign-in for an existing teacher and
admin. This extension supersedes the earlier QA-only/default-off decision for
the local development profile; the historical rationale above is retained.
