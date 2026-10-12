# School Assistant

## Status — 2026-10-06

GND-style replacement implemented and locally accepted. Local and production additive schema pushes succeeded; application and production Trigger worker deployment have not occurred. The owner approved enabling AI_ASSISTANT for local Daarul Hadith only. Its existing domain grants were preserved. DeepSeek chat, persisted history, MCP classroom lookup, Quick/full draft handoff, private text attachments, authenticated PDF worker export/download, and desktop/mobile viewport behavior were verified in the signed-in tenant. Dashboard build succeeds with the local profile. Broad repository typechecks still report pre-existing errors outside the replacement files.

## Environment

The local launcher loads root `.env` plus `.env.local`. Configure one server-only provider key matching Settings → Assistant: `DEEPSEEK_API_KEY` (default provider), `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini). The assistant reuses the managed `DATABASE_URL` and existing `BETTER_AUTH_SECRET`; approval creation and verification must share the same auth secret. Provider/model selection is stored in school settings, not a new environment variable. PDF dispatch additionally uses `TRIGGER_PROJECT_ID`, `TRIGGER_SECRET_KEY`, and a connected/deployed worker with database access. Private attachments and PDFs currently use database storage, so no new blob-storage key is required. Local HTTPS origins must match the shared Portless routes: `APP_ROOT_DOMAIN=school-clerk-dashboard.localhost`, `BETTER_AUTH_URL`, `DASHBOARD_APP_URL`, and `NEXT_PUBLIC_APP_URL` use `https://school-clerk-dashboard.localhost`, and `SCHOOL_SITE_ROOT_DOMAIN=school-clerk-site.localhost`. These non-secret local overrides were corrected during acceptance. Restart the relevant processes after changing environment values. Never expose these secrets through `NEXT_PUBLIC_` variables.

## Experience

- `/assistant?chat=<id>` is the full workspace. A lazy Quick Assistant in the shared navigation shell uses the same runtime/controller and conversation. Minimize retains draft/context; expand moves the view without submitting.
- Header, student row/bulk selection, classroom, finance charge, and inventory launchers add explicit context records. Context is untrusted lookup data and cannot confer access.
- History supports search, paging, rename, archive/restore; messages show the latest 100 entries. Legacy classified conversations remain readable but cannot continue on protocol v2. Unclassified or revoked history remains withheld.
- SDK text streaming, loading/error/reconnect/stop states, persisted action proposals, Markdown answers using Streamdown (raw HTML/images disabled), typed student/classroom/fee/inventory tables, generic structured result details and committed-action receipts.
- School settings are available through `/settings/assistant` even when AI is disabled. Current released admission remains exact `Admin`; no role or module rollout is implied.
- Per-school/user saved prompts and automatic/English/Arabic response language; UTC-day usage and feedback. Provider/model and step/request/token/concurrency budgets are configurable.
- Private PDF/PNG/JPEG/UTF-8 text/CSV uploads: 2 MiB each, five active files, 20 MiB owner storage. Bodies are bounded before multipart parsing, signatures/encoding checked, and owner plus full-history access enforced on downloads. Removal clears bytes. Recent file references persist with the conversation; up to five available files feed later turns.
- Result and saved-action sheets expose conversation exports and file management. Trigger task `assistant-export-conversation` rechecks the login/account/modules/history, renders up to 100 recent messages including structured results to PDF with the bundled Amiri font, and stores an owner-scoped artifact. This is a conversation record, not an official fee receipt or academic certificate. Dispatch failure is explicit. Worker deployment remains a release step.

## Runtime and persistence

`apps/api/src/assistant` owns authenticated orchestration and tRPC `assistant.*`. `packages/ai` owns contracts, tool catalog/policies, provider selection and the request-owned in-memory MCP execution boundary. Next `/api/assistant/chat` streams the AI SDK protocol and registers server consumption with `after`. Provider deadline is 45 seconds; run lease is 55 seconds; at most ten model steps and 4,000 output tokens per step. Text context is bounded without splitting tool call/result pairs. These are bounded execution guarantees, not unlimited background execution.

Browser bearer tokens and server session IDs resolve to a live, user-bound canonical session ID before assistant membership checks; export jobs persist only that canonical ID. Workspace cache resets preserve active settings observers during React effect replay. Browser write requests require an HTTPS Origin matching the public forwarded host used by tenant routing, including behind the local HTTP upstream proxy; authentication remains mandatory.

Every request has a client UUID and canonical content fingerprint. Conversation/config row locks serialize claims, sequence allocation and quota reservations. `AssistantRunRequest` provides a unique new-protocol key without adding retroactive unique constraints to old history. One active run per conversation and a configurable per-user concurrency cap. Expired leases become interrupted failures during recovery. Duplicate requests return 409 with the existing run ID; recovery reads state and never automatically replays writes.

Usage reserves 200,000 tokens per model run, replaces the reservation with known actual usage on completion, and retains conservative reservations for unknown outcomes. Model usage stops the loop at 150,000 accumulated tokens; these reservations are accounting guardrails rather than a provider billing guarantee, especially for multimodal tokenization. Domain approvals reserve no model tokens. Request budgets still count approval runs.

## School actions

14 policy-filtered tools cover student search, classroom lookup, enrollment, class movement, fees/payment, inventory lookup/create/issuance, staff/teacher workspace, attendance, assessment scores and guardians. Mutation admission is separate from model generation.

Persisted proposals use the existing signed v2, ten-minute, user/school/conversation/session/term/tool/input binding. JSON comparison is canonical so PostgreSQL JSONB key order cannot reject valid approvals. Review labels are loaded from owned records instead of trusting model-provided student/item/fee/class names. Record revisions include timestamps; changed fees, placements, stock or assessment scores require fresh review. The approval endpoint reloads access and academic ancestry, locks the proposal, rechecks live admission inside the transaction, consumes confirmation, executes the domain write, records the versioned receipt and completes the proposal atomically. Completed approvals return saved results. Declining and replaying cannot execute another write.

Enrollment and class movement share the ordinary transaction services; fee payments use `recordFinancePaymentInTransaction`, exact Decimal allocation totals, charge locks and existing ledger/audit behavior. Inventory issuance uses an atomic sufficient-stock decrement. Assessment writes retain score history and are bounded to 100 scores per proposal. Unknown outcomes direct users to saved actions; no automatic mutation retry.

## Cutover and data compatibility

The old FAB/components/custom SSE adapter are removed. `/api/chat` conversation/settings/analytics/feedback writes and reads return 410; the old run receipt URL remains a scoped recovery adapter. Legacy rows and receipts are preserved. `SchoolInventory` maps to the existing physical `Inventory` table, avoiding the generated-client collision with legacy lowercase `inventory` without renaming or dropping either table.

## Validation

See [implementation plan](../plans/2026-10-06-gnd-assistant-replacement.md) for actual check results and remaining release gates. [ADR-0074](../decisions/ADR-0074-gnd-assistant-replacement.md) records the replacement; ADR-0025/0026 authorization, approval and history guarantees remain in force.
