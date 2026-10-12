# GND assistant replacement implementation contract

Status: implementation and scoped local acceptance complete. User approved the detailed plan on 2026-10-06.

## Reference and boundaries
GND `components/assistant/{live-assistant-workspace,quick-assistant-panel,assistant-page-workspace}.tsx`, API `assistant/{runtime,contracts,registry,mcp}.ts`, assistant REST/tRPC routers and Prisma models. Midday `chat/assistant-runtime.ts`, REST chat, dashboard chat context/store. Preserve SchoolClerk tenancy, current exact Admin admission, AI_ASSISTANT/domain modules, current history envelope, Arabic/name formatting, and transactional approval/receipt guarantees (ADR-0025/0026). Apps orchestrate; packages own contracts/data/domain transactions.

## Execution checklist
- [x] Shared contracts, additive persistence, ordered messages, deduplicated runs, quotas.
- [x] Authenticated API/tRPC, bounded SDK streaming, reconnect and cancellation.
- [x] Persisted proposals, canonical finance/enrollment/class-change services.
- [x] Full assistant page, lazy Quick Assistant, draft/context handoff, history.
- [x] Typed result cards, contextual row/bulk launchers, query invalidation.
- [x] Private attachments, artifact preview/download and document jobs.
- [x] Settings, saved prompts/preferences, usage and feedback.
- [x] Focused tests/lint, scoped typecheck review, local/prod schema push; broader check failures recorded below.
- [x] Authenticated browser/mobile QA and live provider/development-worker acceptance.
- [x] Compatibility cutover, obsolete code removal, Brain docs and conformance audit.

## UI contract
Canonical `/assistant?chat=<id>` within existing shell. Quick header entry and record launchers lazy-load the same controller. Minimize preserves state; expand transfers once and never submits. URL owns conversation/artifact; store owns draft/panel/context; tRPC owns server state. School/user/term changes reset ephemeral state. History search/rename/archive, empty/error/loading/interrupted/approval states, keyboard/focus/RTL/print/mobile behavior required. Artifact mobile sheet owns close/back; existing tables, filters, columns, sort, resize and selection remain unchanged except scoped AI actions. No inline school forms migrate into assistant: reviewed action cards invoke the same services.

## Data and rollout contract
Additive schema only, preserve legacy rows and receipts. Unclassified history stays withheld. New protocol approvals cannot use legacy tokens. One executor per request, server-owned messages, recover saved state without replaying writes. Exact current domain grants rechecked at execution. Canonical business changes plus approval and receipt commit atomically. Production remains gated by school config. Use only db:generate and db:push --local/--prod; no migrations or force reset.

## Omitted reference features
GND sales/dealership drafting and GitHub delivery workflow have no school-domain counterpart. No arbitrary SQL, shared-user chats, inferred module grants, or new role rollout. Existing table rebuilds are outside assistant integration.

## Validation and conformance
Test request conflicts, two-user/two-school isolation, revoked permissions/history, expired/tampered/replayed/concurrent approval, commit-before-disconnect recovery, term changes, quota concurrency, canonical payment/enrollment effects, private files, quick/full handoff and mobile keyboard. Record actual checks/results below, not assumed passes. UI stack must use existing Portless/cmux workflow.

## Verification record and conformance audit

- `bun run db:generate` succeeds. Both required local and production schema pushes succeed, including cleanup foreign keys. Initial unique-index warning was resolved by a new request-key table; no destructive flags used.
- 23 focused tests pass (41 assertions) across contracts, canonical JSON/signatures, file validation, refined MCP tool schemas/errors, revision timestamps, assessment history and proxy-aware HTTPS same-origin admission.
- Disposable local PostgreSQL integration test passes (32 assertions): school/user/history isolation, simultaneous request dedup/conflicts, concurrency quota, no mutation before approval, ordered messages/idempotent finish, concurrent/replayed/stale/expired approvals, authoritative item labels, session expiry, browser bearer-token normalization, interrupted-run recovery, SDK streaming/persisted reconnect dedup, provider failure and authenticated PDF generation. Fixtures are removed in `finally`; no real school records used.
- 44 new TypeScript/TSX files pass focused Biome lint. Jobs typecheck passes. Assistant-scoped/API checks have no diagnostics in replacement implementation files; existing errors remain in other imported API/database/shared UI modules. Root `bun run typecheck` stops on existing shared React type incompatibilities in site-nav.
- Existing finance suite: 45/46 pass after updating fixtures for the active inventory client accessor. Remaining report-router test lacks account membership in its old auth fixture, independently of the assistant change.
- Dashboard production build succeeds with the local environment profile after correcting non-secret local HTTPS origins. Earlier local/production-profile attempts failed `/sign-up` origin validation; the production-profile configuration was not changed or revalidated. The build does not override the separate broad TypeScript failures above.
- Standalone PDF smoke check emitted a valid PDF with English and Arabic text using Amiri; the authenticated export function also passed local integration.

Source conformance: shared server/domain package ownership, one lazy controller with full/Quick portal targets, explicit context launchers, conversation/result URL state, history paging, preserved host table controls, scoped query invalidation, settings recovery, private assets and approval receipt separation are implemented. GND dealership-specific workflows were omitted because they do not apply to school operations. Existing school tables/forms remain authoritative.

## Authenticated local acceptance — 2026-10-06

The existing signed-in Daarul Hadith tenant was used on the shared HTTPS Portless proxy. The owner supplied the DeepSeek key and explicitly approved local AI_ASSISTANT enablement. Only that module was added to the local entitled/enabled arrays; other domain grants and production school configuration were preserved.

- Disabled-module admission and settings recovery were verified before enablement. Fixed bearer-token versus canonical session-ID admission, active-query lifecycle resets, and public HTTPS origin comparison behind the internal HTTP proxy.
- Live DeepSeek response streamed and persisted across reload. MCP `listClassrooms` returned seven classes, including Arabic labels. Classroom cards render names/streams and answer Markdown renders correctly.
- Quick minimize/reopen and expansion into the same full conversation preserve the draft without sending it. Result-sheet open/close updates the artifact URL state.
- Synthetic UTF-8 attachment upload succeeded; the assistant answered correctly from its content. No student records were uploaded.
- The configured development Trigger worker completed an export. Its authenticated download was confirmed as a valid five-page PDF. This verifies dispatch through completion, not production worker deployment or a visual typography audit.
- Desktop and 390×844 viewport checks covered settings scroll-to-save, full/Quick composers, draft preservation across navigation, and Escape returning focus to the Quick launcher. No physical mobile keyboard test is claimed.
- No live student, enrollment, finance, inventory or assessment writes were performed. Mutation/approval behavior was exercised with disposable local integration fixtures.
- Scoped lint passed after the acceptance fixes. The prescribed development stack was restored in a new cmux tab after the successful build; the global Portless CLI confirms all three local app routes.

Application and production worker deployment were not requested and have not occurred. Production rollout must supply valid origins, provider settings and the deployed export task. Existing broad typecheck and legacy finance-fixture failures remain documented above.
