# ADR-0068: Dashboard request performance

Date: 2026-10-05
Status: Deployed; regional proxy follow-up in progress

## Decision

Follow Midday's `trpc/server.tsx` and `trpc/request-context.ts`: start optional prefetches without awaiting, hydrate pending queries, retain existing Suspense/error/table components, and bound SSR HTTP fetches at eight seconds. Keep the existing HTTP API authorization boundary and Prisma database implementation.

React render-only request context shares canonical signed-session/workspace reads across server components and transport headers. No workspace identity is cached across requests. Cookie-changing actions retain independent live workspace validation; signed identity remains storage-backed. School-scoped display settings combine name format and academic direction in one render-cached read. The shell module/navigation query is awaited as critical initial markup: treating it as optional caused a server/client navigation hydration mismatch in Chrome. Optional table prefetches still hydrate pending queries. AUTO analysis retains its existing five-minute non-authorizing cache.

Browser SWR and tRPC header generation share only an in-flight profile promise. Every subsequent read fetches fresh context. Profile network/database failures return 503, while absent identity returns 401; all responses are private/no-store. Only confirmed 401 triggers the tRPC login redirect.

The PrismaPg adapter owns an explicit six-connection pool with zero minimum, 5s acquisition/connect deadline, 10s idle release and existing TLS normalization. No blanket SQL deadline is introduced: API transactions and background jobs have different budgets. No schema/index/provider URL change is made. Add model/operation elapsed time and pool counters without SQL/arguments; these timings include ORM/network/pool overhead and do not claim server-only SQL execution time.

Proxy-generated request IDs connect middleware, render and SSR API logs. Slow stages/procedures/operations (>=1s) log by default; DEBUG_PERF=true includes all. Runtime initialization logs database provider and Vercel region with the credential-free hostname, without usernames, passwords or tokens. Layout maximum duration is 60s as termination protection, matching the existing tRPC route; faster delivery comes from reduced blocking work. A static favicon redirect prevents missing favicon.ico from serving dynamic tenant HTML. Closed finance account action sheets do not query accounts until opened. Dashboard totals stream behind Suspense/error boundaries; their database package query explicitly scopes school/session ancestry.

## Reference and scope

Reference: Midday customers route, server prefetch/request context, API timing middleware and PostgreSQL pool lifecycle. Existing headers/sheets/forms/filters/columns/bulk actions/pagination are preserved because the task is latency reduction, not a product workflow rebuild. Persistent Railway pool sizes, replicas, SSL exceptions and Supabase auth are not applicable to this Vercel/Prisma/Better Auth deployment.

## Verification

Chrome production baseline: authenticated Daarul Hadith dashboard warm reload DOMContentLoaded 2.09s/load 2.12s; four profile reads including 4.34s; classroom DOMContentLoaded 3.40s/load 3.46s. These are individual observations with normal cache and no throttling, not aggregate latency claims. Focused tests: 38 passed; DB and utilities typechecks, focused lint and the dashboard production build passed. Live local dashboard stats returned zero for wrong-school and wrong-session inputs. Chrome showed seven classrooms and 185/3/7 dashboard counts; sign-out and protected-route redirection passed. Corrected local classroom reload measured DOMContentLoaded 1.14s/load 2.15s with no new hydration error; development and production timings are not comparable. Existing form Fragment warnings, ineffective classroom text filtering, broad workspace typecheck errors and two failures in the unchanged teacher-authorization suite remain reported limitations.

Vercel read-only Neon plans: tenant lookup execution 0.032ms; nonexistent session-token probe 0.042ms; representative student-count aggregate actual time 0.280ms (editor round trip 1329ms). No index is justified by these samples. The deployed runtime diagnostics confirm the pooled Neon US East hostname; API functions execute in iad1. Proxy logs instead show fra1, with roughly 1–2s total and a SchoolProfile operation at 1288ms. This regional database round trip remains a material bottleneck.

Commit 6e39eeb deployed successfully as dpl_7yxJLmSLRiccVwnTzTwR6qV9sxms and serves the Daarulhadith production tenant. The initial post-release dashboard load measured DOMContentLoaded 8.87s/load 8.92s; subsequent warm samples were 2.52/2.55s and 2.96/2.98s. The initial sample may include new deployment cold starts; warmth is not proven. Two profile requests replace the four-request baseline. No dashboard speedup is claimed from these observations.

Authenticated GitHub release readback confirms the missing-key blocker also affects CI: production and repository secret/variable name lists are empty, and run 37338713056 for current HEAD 515202b8b24e9149c7ae3e8a31a99117bb29ca13 failed with the same unavailable signing-key message. No GitHub configuration was changed or secret value read.

Owner approval — 2026-10-05: the owner approved the pending commit/release actions and explicitly instructed “ignore release gate.” This exception applies to this performance release. The repository verifier and CI checks remain unchanged; no signed evidence is fabricated. Production deployment and comparable tenant timing proceed under this direct owner instruction. Fluid Compute approval is included in the pending approved settings change.

Fluid Compute was enabled and saved in schoolclerk-dashboard settings, then confirmed persisted after a Chrome reload. Deployment 6e39eeb applies this approved setting. No provider URL, school record or financial transaction was changed.

Regional follow-up: apps/dashboard/vercel.json places src/proxy.ts in iad1, alongside the production Neon database and API functions, using Vercel’s documented per-function regions override. Preserve every existing tenant/session/workspace check and cookie rule; change only execution location. Confirm the actual proxy region and timings after the follow-up deployment before declaring the recurring latency resolved.
