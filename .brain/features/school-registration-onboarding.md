# School Registration And Onboarding

## Status
Active

## Goal
Let a new school self-register, reserve its public website and dashboard domains, verify the owner email, and continue into dashboard onboarding.

## Production Domain Contract
- Public school site: `{school-subdomain}.school-clerk.com`
- Dashboard workspace: `dashboard.{school-subdomain}.school-clerk.com`
- The generated dashboard host is not stored in the database. It is derived from the tenant subdomain and production root domain.
- `TenantDomain.subdomain` stores only the slug, such as `northfield`, and remains the tenant lookup key.
- Dashboard proxy resolution strips the leading `dashboard.` host segment before resolving the tenant slug.

## Signup Flow
1. User submits `/sign-up` with school identity, owner account details, and requested subdomain.
2. Server validates institution type, reserved subdomains, subdomain availability, and owner email uniqueness.
3. Signup creates `SaasAccount`, `SchoolProfile`, primary verified `TenantDomain`, and the owner Better Auth user.
4. Production signup provisions both exact Vercel project domains:
   - `{subdomain}.school-clerk.com` on the public school-site project.
   - `dashboard.{subdomain}.school-clerk.com` on the dashboard project.
5. Signup creates a 24-hour `Verification` token for `email-verification:{token}` and sends the owner a Resend verification email.
6. Signup also sends the existing workspace-ready email with dashboard onboarding and public-site URLs.
7. Signup and verification email subjects are prefixed with the school name rather than the platform brand.
8. The client redirects to the dashboard login with `return_to=/onboarding/welcome`.

## Verification
- Public route: `/verify-email?token=...` on the tenant dashboard host.
- Token store: existing `Verification` model.
- Successful verification sets `User.emailVerified = true` and deletes the used verification row.
- Invalid or expired links show a safe public failure state and do not require an existing session.

## Environment Variables
- `APP_ROOT_DOMAIN`: production root domain, normally `school-clerk.com`.
- `SCHOOL_SITE_ROOT_DOMAIN`: optional override for public school-site root/domain suffix.
- `VERCEL_BEARER_TOKEN`: token used by the dashboard signup action to call Vercel.
- `VERCEL_TEAM_ID`: team context for Vercel domain attachment.
- `VERCEL_SITE_PROJECT_ID`: Vercel project id for `apps/school-site`.
- `VERCEL_DASHBOARD_PROJECT_ID`: optional dashboard project id override. Falls back to `VERCEL_PROJECT_ID`.
- `VERCEL_SITE_PROJECT_SLUG` and `VERCEL_DASHBOARD_PROJECT_SLUG`: optional project slug overrides.

## Notes
- Domain provisioning is idempotent for already-registered domains.
- Public school-site login redirects to the shared dashboard auth system at `dashboard.{subdomain}.school-clerk.com/login`.
- Parent enrollment password/reset redirects use the same dashboard-prefixed production origin.
