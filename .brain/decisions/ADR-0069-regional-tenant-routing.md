# ADR-0069: Regional tenant routing validation

Date: 2026-10-06
Status: Implementation and verification in progress

## Decision

Move the existing complete dashboard tenant/session/workspace routing resolver from global Proxy to a server-only regional API facade in iad1. Proxy sends one bounded, authenticated metadata request and applies its resulting next/rewrite/redirect headers and canonical cookie changes. The prior resolver body, database filters and auth/ancestry/academic-selection predicates are unchanged.

Pure routing alone is insufficient for the current app: server actions still depend on its live entry gate. Retain that gate for all matched requests rather than relying only on layouts, which do not authorize direct action invocations. This is a deliberate adaptation of Midday's thin proxy/API/DB layering to School Clerk's existing Better Auth/Prisma boundaries. No user/module/role access is granted by transport.

The internal endpoint authenticates the exact metadata payload using a domain-separated HMAC derived from the existing server-only BETTER_AUTH_SECRET. Request ID, issue time, original URL/method/headers (including identity and workspace cookies) are bound. Responses bind to the requesting proof and preserve middleware forwarding/cookie directives. Proof validity is 30 seconds; each accepted call still runs live session/workspace validation. Request/response bodies are capped, private/no-store and never logged. Missing/tampered/stale proof is denied before database work. Unavailable/malformed/timeout transport returns 503 and does not clear identity or grant access. No completed authorization decision is cached across requests.

Outbound origins come only from configured application-root hosts, configured auth/app origin for custom domains, or the server-provided preview deployment URL. Preview protection remains enabled and may reuse existing preview access/bypass configuration; no new credential or permission is created. Local explicit proxy ports are retained. Next route handler is nodejs, preferredRegion iad1, maxDuration 15; proxy timeout is eight seconds.

Use official Fluid Compute pool lifecycle support for the existing pg pool only under VERCEL=1; retain max six, min zero, acquisition five seconds, idle ten seconds, TLS and transactions. No schema/provider URL or paid compute change. Neon scale-to-zero is not proven to be the recurring warm bottleneck and remains unchanged.

## Verification

Transport negative/fidelity tests, existing live-workspace negative tests, local tenant/login/action/profile behavior, package/broad typechecks, lint, optimized build, production runtime regions and timed Chrome tenant reloads are required. Old application b8fbbcd baseline: dashboard median load 2.07s, classrooms 2.44s over three samples, proxy slow totals roughly 1.4–1.9s in Europe. Warm/cold observations remain separate. Owner's existing performance-release approval and explicit gate waiver apply; verifier/CI remain unchanged.
