# ADR-0074: Shared School Assistant workspace and execution boundary

Date: 2026-10-06. Status: accepted and implemented; scoped local acceptance complete.

## Decision

Replace the development FAB/custom SSE implementation with GND's full workspace plus lazy Quick Assistant pattern, one AI SDK controller, durable conversations/runs and a request-owned in-memory MCP client/server. Reuse the existing monorepo and school domain services; do not import dealership-specific GND actions or copy its tenancy model.

Apps own transport/auth/orchestration. `packages/ai` owns provider-independent contracts/policies/tools. `packages/db/assistant` owns scoped history/run persistence. Files/artifacts are private database bytes behind authenticated endpoints; bounded PDF exports run as Trigger tasks with bundled fonts and fresh authorization.

Request IDs and fingerprints are unique in a new table; old message/run tables gain nullable/indexed metadata without retroactive uniqueness constraints. PostgreSQL row locks allocate ordered messages and reserve daily usage. Leases and receipts support recovery after disconnection without replaying writes.

Persist proposals separately from streaming text. A model only prepares them. The explicit owner decision route consumes the signed approval, invokes the canonical business transaction and saves its receipt/proposal result in that transaction. Compare JSON values canonically and include real timestamps in revision fingerprints. Authoritative record names are displayed in previews.

Preserve exact Admin admission and conservative full-history tool envelopes from ADR-0025/0026. Settings recovery cannot grant missing AI/domain modules. A source/target identity or tool ID is never authority.

## Tradeoffs and rollout

Database byte storage keeps this first release private without adding public blob URLs; enforce per-file and per-user bounds. Exports require the new Trigger task to be deployed. Model token reservations are conservative accounting; provider tokenization is not a hard billing cap. Recent history/file context is bounded. Archived chats cannot start runs and running chats cannot be archived.

Legacy history is retained with no permission backfill. Old mutable chat endpoints retire with 410; receipt recovery remains. Rename only the Prisma active inventory model to `SchoolInventory` with `@@map("Inventory")`; preserve both physical inventory tables.

No UI/module entitlement or role is automatically enabled by schema rollout. Local/prod schema push commands succeeded without accept-data-loss or force flags. Authenticated desktop/mobile viewport acceptance, live DeepSeek and development-worker export succeeded. The owner explicitly approved local Daarul Hadith AI_ASSISTANT enablement; other grants and production configuration were preserved. Application and production-worker deployment remain separate release steps.
