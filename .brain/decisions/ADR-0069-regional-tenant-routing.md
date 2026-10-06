# ADR-0069: Regional tenant routing validation

Date: 2026-10-06
Status: Implementation released; performance acceptance pending

## Decision

Move the existing complete dashboard tenant/session/workspace routing resolver from global Proxy to a server-only regional API facade in iad1. Proxy sends one bounded, authenticated metadata request and applies its resulting next/rewrite/redirect headers and canonical cookie changes. The prior resolver body, database filters and auth/ancestry/academic-selection predicates are unchanged.

Pure routing alone is insufficient for the current app: server actions still depend on its live entry gate. Retain that gate for all matched requests rather than relying only on layouts, which do not authorize direct action invocations. This is a deliberate adaptation of Midday's thin proxy/API/DB layering to School Clerk's existing Better Auth/Prisma boundaries. No user/module/role access is granted by transport.

The internal endpoint authenticates the exact metadata payload using a domain-separated HMAC derived from the existing server-only BETTER_AUTH_SECRET. Request ID, issue time, original URL/method/headers (including identity and workspace cookies) are bound. Responses bind to the requesting proof and preserve middleware forwarding/cookie directives. Proof validity is 30 seconds; each accepted call still runs live session/workspace validation. Request/response bodies are capped, private/no-store and never logged. Missing/tampered/stale proof is denied before database work. Unavailable/malformed/timeout transport returns 503 and does not clear identity or grant access. No completed authorization decision is cached across requests.

Outbound origins come only from configured application-root hosts, configured auth/app origin for custom domains, or the server-provided preview deployment URL. Preview protection remains enabled and may reuse existing preview access/bypass configuration; no new credential or permission is created. Local explicit proxy ports are retained. Next route handler is nodejs, preferredRegion iad1, maxDuration 15; proxy timeout is eight seconds.

Use official Fluid Compute pool lifecycle support for the existing pg pool only under VERCEL=1; retain max six, min zero, acquisition five seconds, idle ten seconds, TLS and transactions. No schema/provider URL or paid compute change. Neon scale-to-zero is not proven to be the recurring warm bottleneck and remains unchanged.

## Verification

Transport negative/fidelity tests, existing live-workspace negative tests, local tenant/login/action/profile behavior, package/broad typechecks, lint, optimized build, production runtime regions and timed Chrome tenant reloads are required. Old application b8fbbcd baseline: dashboard median load 2.07s, classrooms 2.44s over three samples, proxy slow totals roughly 1.4–1.9s in Europe. Warm/cold observations remain separate. Owner's existing performance-release approval and explicit gate waiver apply; verifier/CI remain unchanged.

## Released evidence — 2026-10-06

Application 4a8001e / dpl_s5wsk4AZeDnaHxvdiU1DFeWKaePX is Ready and assigned to production tenant domains. 63 focused tests, Biome, optimized build and DB typecheck pass. Dashboard retains exactly the 97 baseline diagnostic locations/codes; root typecheck has existing shared failures. Compiled Proxy trace has no Prisma/Better Auth dependency. Local Chrome login/logout/protected redirect, dashboard/class data, client navigation and form open/cancel pass. Production counts184/3/7, seven classroom rows, client navigation and no test-tab console errors are verified. Unsigned internal requests403, signed-out classroom307 return_to. A deployment-specific 15-minute 5xx query returned zero records. No school/financial writes.

Actual handler/database region is iad1; global Proxy remains fra1. One correlated post-deploy sample: routing.total1132.46ms, regional fetch3067.41ms, Proxy total3090.33ms. Connection acquisition1136.45–1312.76ms with waiting0 leaves startup/transport overhead; no pool saturation claim. Three signed-out HTTP samples0.931/0.714/0.752s are not authenticated page timings. Authenticated Chrome comparison was interrupted by a separate active EwaTrade QA chat; first post-deploy10.19s and one later4.59s dashboard load are incomplete observations, excluded from a before/after claim. Performance acceptance remains open until isolated three-sample page measurements. No speed improvement or controlled cold verification is claimed.
