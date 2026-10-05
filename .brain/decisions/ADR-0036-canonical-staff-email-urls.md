# ADR-0036: Canonical HTTPS destinations for staff setup links

Date: 2026-09-08
Status: Implementation written; verification deferred

## Context

Staff invitation URL generation still used forwarded Host/protocol, detected LAN interfaces, developer network overrides and raw application port fallbacks. The queue binding protected the exact URL but did not independently require that URL to be an authorized destination. An old incorrectly constructed URL could therefore remain accepted by the worker.

## Decision

Move pure HTTPS configuration parsing and canonical tenant URL helpers to the existing utils package, retaining the auth/configuration public re-export. Auth owns origin authorization; DB owns current identity/ownership; dashboard/jobs orchestrate through shared package APIs. This follows the Midday package-boundary pattern without introducing a jobs-to-auth dependency.

For staff setup only, build `/reset-password` on `dashboard.<slug>.<configured-root>` in hosted environments and `<slug>.<configured-root>` on named localhost roots. Preserve HTTPS and explicit configured proxy port. The caller supplies the stored slug from its existing current-school authorization. Do not use request headers, network-interface discovery, LAN overrides or raw app-port defaults. Raw IP/bare-localhost/automatic Vercel-preview roots cannot provide this tenant hostname contract and require a tenant-capable configured root rather than inferred hosts. Verified custom domains remain valid auth origins but are not automatically selected for staff email.

Worker reloads current identity/proof and checks the same configured destination before rendering and before external delivery. Require exact canonical origin/path, no credentials/fragment, one each of onboarding/staffId/email/token, no extra fields and matching current staff/email. Existing proof/digest checks remain mandatory. Noncanonical old jobs skip delivery and require authorized reissue. Deployment metadata forwards existing auth URL configuration keys so producer and worker can use the same policy; no env values are changed by implementation.

## Limits and deferred verification

Canonical DNS/tenant proxy routing and actual provider delivery are not verified. Producer/worker configuration must agree and use the active shared HTTPS proxy origin, including its real port when applicable. No custom-domain discovery, automatic preview wildcard provisioning or live legacy queue repair occurs. This does not recall previously sent links or make external delivery atomic.

No UI layout change, tests/typechecks/builds/lint, browser/mobile QA, emails/jobs, env edits, deployments, schema operations or commits. Later verify local/hosted canonical URLs, explicit ports, invalid configuration, changed slug/root, old queued destinations, duplicate/extra/encoded query fields, proof identity mismatch and mobile onboarding link navigation. General sign-in, cached sessions, legacy auth and the full pending portfolio remain incomplete.
