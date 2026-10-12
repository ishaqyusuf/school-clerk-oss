# ADR-0079: Local QA identities and select-only quick login

- Date: 2026-10-12
- Status: Implemented locally. Tests and browser QA pass.
- Amends: ADR-0034 (local QA quick login)

## Context

The local database is a copy of production (`db:sync`). Passwordless local sign-in already existed (ADR-0034, the follow-up from 2026-09-27), but it accepted any local user. The picker also kept showing a Password field, so it looked as if a password was required. The owner asked for the ewatrade approach: every local email on a QA domain, and an account picker that signs in by selection alone.

## Decision

- `packages/db/src/local-qa-emails.ts` rewrites every email column to `<local-part>@ishaq.qa.test`, with `.2`, `.3` … added on collisions. Run it with `bun run --cwd packages/db db:qa-emails`.
  - Columns: User, SaasAccount, StaffProfile, AssessmentPublicLink.requesterEmail, EnrollmentApplicationParent and FinancePayee.
  - It refuses to run unless `SCHOOL_CLERK_DB_MODE=local` and `DATABASE_URL` is a loopback host.
  - It is idempotent, and each original address maps to the same QA address in every table.
  - Run it again after every `db:sync`.
- Passwordless eligibility (`getDevelopmentLoginUser` and `listDevelopmentLoginUsers`, used by both the auth endpoint and the login action) now also requires an email ending in `@ishaq.qa.test` (`LOCAL_QA_EMAIL_DOMAIN`). The existing gates are unchanged: development, local database mode, loopback database and request host, and the opt-out flag.
- On the login page, choosing a QA account signs in at once. When a QA account is selected, the Password field is hidden and the button reads "Sign in as …". Non-QA local accounts still need a password.
- Account QA/NORMAL lanes are not changed. `EMAIL_QA_DOMAIN_ROUTES` is not configured locally, so the rewritten addresses stay in the NORMAL lane, matching the existing account.

## Consequences

- Real staff email addresses no longer exist in the local copy, so a local QA run can't email real people.
- Every role in the copied school can be tested locally with one click, without passwords.
- If a fresh `db:sync` is not followed by `db:qa-emails`, local users won't appear as quick-login options.
