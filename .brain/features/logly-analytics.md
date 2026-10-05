# Logly product analytics

Implemented 2026-09-07 under portfolio ticket LGL-107. Source implementation and production namespace provisioning are complete; consumer deployment and interactive acceptance remain pending the owner-requested follow-up.

## Ownership and boundaries

`packages/events` owns the browser provider, privacy projection and same-origin ingest route. Dashboard, marketing and school-site root layouts compose the provider. This follows the Afterservice `packages/events` pattern in `/Users/M1PRO/Documents/code/micro-startups/after-service` and uses published Logly 0.2.0 contracts.

Production Logly organization `schoolclerk` owns `schoolclerk-web`. Each has independent credentials and project-scoped identity. The collector is `https://logly-chi.vercel.app`. Credentials are stored in the Git-ignored root production env configuration and sensitive Vercel production variables; never copy them into Brain, screenshots or public variables.

The provider is disabled unless `NEXT_PUBLIC_LOGLY_ENABLED=true`. Public configuration contains only the project slug. Browser requests use `/api/analytics`; the server reads `LOGLY_COLLECTOR_URL` and `LOGLY_PROJECT_KEY` (client-ingest scope). Turbo declares these inputs. Root `.env.production` is configured; this does not imply Vercel/EAS environment propagation or a deployed consumer release.

## Privacy and transport

Only `site_visit` and `page_view` are forwarded. Routes retain only an allowlisted first static segment; other routes become `/other`. Query strings, dynamic IDs, emails, authenticated actor IDs, arbitrary properties, referrers and campaigns are removed. Consequently this initial integration reports acquisition as direct/unknown and does not emit business conversion events. Cross-product identity is never shared. Browser privacy signals are respected.

The server validates the batch, overwrites the project with its configured namespace, cancels streaming reads as soon as bodies exceed 48 KiB, and uses a four-second collector timeout. It accepts the canonical product domain and its subdomains, plus localhost in development. Unregistered custom tenant domains are not accepted by this initial proxy policy. The proxy forwards the canonical registered origin to Logly; raw tenant hostnames are not sent as event attributes. Upstream failures remain non-success responses so clients retry. No database or business/auth contract is changed.

## Verification and follow-up

Focused tests exercise route privacy, origin rejection, fail-closed credentials and failed upstream delivery. Native products also test retries, UTC-day rollover, storage failures, duplicate navigation and separate mobile credentials. Package TypeScript validation passes. See the portfolio report for complete application-check results.

No active OpenPanel source calls were found during the scoped migration search. SchoolClerk's unused Vercel analytics dependency is retained; it has no active import in the scanned source. Existing data and unrelated work remain intact.

Before live acceptance, propagate the documented production env variables to the corresponding Vercel projects and, for native products, EAS; deploy the reviewed consumer changes. Then confirm one website navigation and one native navigation reach only their respective projects, privacy signals suppress browser tracking, private route/query values are absent, and failures do not interrupt product use. This interactive phase is deferred by the owner.

### 2026-09-07 rollout follow-up

Streaming payload-limit and exact-boundary/malformed-body tests now pass. Package test counts: 7 tests / 21 assertions. No full-app pass or consumer deployment is implied.

Analytics production variables were added successfully to verified Vercel projects `schoolify`, `schoolclerk-dashboard`. Client-ingest keys are sensitive; public variables contain only switches/slugs. Configuration applies to the next deployment, not already-built artifacts. No consumer deployment was dispatched.

## Country heat-map forwarding — 2026-09-07

The shared analytics proxy forwards Vercel's `x-vercel-ip-country` as `x-logly-country` only when `VERCEL=1` and the value is an uppercase two-letter code. Logly enforces its exact ISO whitelist; invalid/missing values remain unknown. Browser-supplied `x-logly-country` and raw IP headers are not forwarded. The same edge metadata applies to independently scoped native routes where present. No body field, IP/GPS storage, user identity or consumer database change. Counts reflect the delivery network; old events remain unknown. Focused package tests and TypeScript checks pass; consumer deployment and owner-deferred live acceptance remain outstanding.

## Combined main release — 2026-10-05

Both `codex/logly-dashboard-release` (8c00cd6) and `codex/logly-marketing-release` (eb66317) are ancestors of main through merge 2ba757c. Their shared analytics source matches the integrated package, including Logly Next ^0.2.1 and country forwarding; dashboard, marketing and school-site retain their providers/routes. Commit d71f918 includes all pending workspace changes; 3cbec56 adds explicit Vercel upload exclusions for env files and generated artifacts. Dashboard/marketing builds now generate Prisma from their cloud-safe build scripts, with no dependency on the sibling local infrastructure checkout.

Local schema was already synchronized; prescribed production schema push succeeded without destructive flags. Eight focused analytics tests pass. Full suite: 470 passed, 41 failures and one Playwright/Bun collection error; root typecheck retains shared errors. These results do not establish full release-assurance gate success.

Vercel production builds were dispatched to the verified existing projects `schoolclerk-dashboard` and `schoolify`, with domain promotion held until Ready verification. Dashboard has all four production Logly variable names configured. No separate school-site project exists among the authenticated team's project inventory. Deployment readiness, promotion and live analytics acceptance are being verified in this rollout.

Git deployment exposed Next 16.3's adapter/standalone trace incompatibility (missing `next-server.js.nft.json`; upstream issue vercel/next.js#96646). Dashboard now uses Vercel adapter output when `VERCEL=1`, retaining standalone for self-hosted builds. Production Daarul Hadith has no module configuration; dashboard promotion awaits the owner's choice to copy local enabled/entitled modules (Finance disabled) or keep it staged.

Marketing deployment `dpl_2pZKjwAQHnEyYAMeYvLYF8A8Yr2c` (b849a73) is Ready and assigned `school-clerk.com` / `www.school-clerk.com`. Live browser navigation loaded the updated page without console warnings/errors; Vercel request logs show canonical-domain `POST /api/analytics` returning 202. Generated deployment-domain analytics correctly returned 403 under the canonical origin policy. Marketing production has all four Logly names and DATABASE_URL configured.

Dashboard deployment `dpl_7Da41Xm9HxeXeM7CGuqcLkckYZ4D` (983ae81), `schoolclerk-dashboard-704yjjdjr-ishaqyusufs-projects.vercel.app`, is Ready / Production Staged. All three Vercel build tasks passed with the adapter-output fix. Canonical dashboard domains were not promoted: production module adoption still requires the owner's decision. A redundant staged marketing build remains queued; cancellation was rejected by automatic approval review and was not retried.
