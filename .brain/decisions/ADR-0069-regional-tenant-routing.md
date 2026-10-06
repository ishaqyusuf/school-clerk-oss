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

## Final controlled verification —2026-10-06

Current status: Accepted for implementation and bounded warm verification; this supersedes the earlier pending acceptance status. Dashboard warm Chrome Load0.906/2.210/0.962s: median0.962s vs2.07s, observed53.5% reduction. Classes3.540/0.919/1.030s: median1.030s vs2.44s, observed57.8% reduction. These are three accepted loads per page from one authenticated tenant/browser, with normal cache and no throttling, not an SLA or exact useful-data readiness measurement. One focus-change1.06s sample was excluded; first-after-inactivity Dashboard5.20s was separate. No forced cold test, paid/provider/schema change or school/financial write.

Native Chrome fresh inspector/cleared logs and own-tab focus checks. Both EwaTrade chats confirmed owner-approved Chrome pauses and received resume messages after completion; inspector closed. Each accepted load had two profile200 responses; seven classroom rows and no test-tab console errors at completion. Measured docs-only9997c72/dpl_5NrLRzUmGLQMHexKqqgU4V4VP7Kt, application code4a8001e. Deployment-specific15-minute5xx query returned zero records.

A separate /student-report request recorded SchoolProfile.findFirst73196.98ms and workspace.resolve73218.77ms application elapsed, HTTP200. This does not establish73s SQL execution or pool saturation. Read-only production snapshot: zero lock waiters, two idle clients, one SchoolProfile row, small tenant lookup execution0.030ms, local connection acquisition1452ms. Inherited statement/lock timeouts0. Diagnostic used a local5s statement timeout in READ ONLY and rolled back; application settings unchanged. Historical network/lifecycle/SQL cause is unresolved. Startup and sporadic outliers remain a backlog follow-up; do not add indexes or global mutation/transaction timeouts from this sample.
