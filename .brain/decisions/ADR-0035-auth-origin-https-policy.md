# ADR-0035: Configured HTTPS and independently verified auth origins

Date: 2026-09-08
Status: Implementation written; runtime/rollout verification deferred

## Context

Auth previously reflected the incoming Origin and request URL into trustedOrigins, alongside blanket Expo and a hardcoded tunnel. Dashboard auth initialization manufactured an HTTP development origin, prepended HTTPS to potentially complete public URLs and had an unrelated demo-domain fallback. These patterns undermine origin validation and shared HTTPS proxy consistency.

## Decision

Auth owns a strict configuration parser and origin policy; DB owns tenant/domain verification. Dashboard initializes auth from BETTER_AUTH_URL, then DASHBOARD_APP_URL, otherwise the environment-appropriate configured public/root host. HTTPS is required. Preserve explicit ports, reject credentials/query/fragment/non-auth paths, and retain the existing bare-localhost dashboard-name mapping only for APP_ROOT_DOMAIN fallback. No raw application port or invented demo host is used. Browser auth client targets actual window origin; SSR consumers should use the server auth boundary.

Configured application origins form the fixed trust set. Request Origin, referrer and destination values are added only after independent validation. Tenant subdomain patterns must match a configured scheme/port/root and resolve to exactly one active school in a non-purging account. Custom domains require verified, active TenantDomain plus matching active school/account ownership and HTTPS default port. No wildcard, opaque/native or tunnel entry is automatically accepted. Database errors never fall back to trust.

Explicit foreign Origin is rejected in the auth before hook before custom recovery can return early. Cookie-bearing HTTP mutations with no Origin require a trusted referrer. Keep Better Auth's normal CSRF and callback validation enabled. Installed framework dynamic-origin and middleware sources were inspected; the Midday configured-URL/auth layering was used without copying its unrelated fallback hostname.

## Compatibility and limits

Deployment must supply a correct HTTPS configured URL, including the shared proxy port if not standard. Insecure/malformed/missing configuration now fails explicitly. No env or proxy configuration was changed or runtime origin discovered/verified in this implementation slice. Native application schemes, explicit tunnels and additional environments need an intentional validated policy rather than reflected trust. Trusted origin is not permission to read another tenant's data.

Tenant email URL generation, general sign-in, legacy auth helpers and cached-session consumers still need their remaining audit. Framework-level additional environment configuration and all deployment values need review during rollout. No UI layout change, tests/typechecks/builds/lint, browser/mobile QA, HTTP requests, live sessions/logins, database operations or commits. Deferred cases include valid root/tenant/custom origins, deleted/purging/unverified ownership, unknown slugs, wrong ports/schemes, null/malformed Origin, referrer fallback, callback injection, SSR/client hydration and recovery on the active HTTPS proxy.
