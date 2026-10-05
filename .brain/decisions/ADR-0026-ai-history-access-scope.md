# ADR-0026: Scoped AI history and server-owned transcripts

## Status
Implemented; verification and legacy review pending.

## Context
Tool gating alone does not protect saved assistant prose, conversation titles/previews, run prompts or analytics after module/capability revocation. Historical records lack trustworthy provenance, and the old browser message POST accepted assistant/system content supplied by clients.

## Decision
- Store `AssistantConversation.meta.historyAccess = { version: 1, toolNames: string[] }` on newly created conversations. Use a conservative union of tools made available to runs, not an unsupported claim that each sentence can be assigned to a domain.
- Before a run, require current permission for the existing scope, then extend it for newly available tools. Never shrink scope automatically. Tool/capability revocation withholds the entire conversation until its full scope is permitted again; users can start a new scoped chat.
- Missing, malformed, duplicate or unsupported metadata is unclassified and fails closed. Preserve legacy records without reading their content into responses/model context or automatically assigning them a trusted scope. A separate reviewed classification/import process is needed to restore them.
- DB-owned row-lock transactions serialize scope checks, expansion and appends. List/analytics operations hold shared locks on the exact owned rows whose metadata is inspected, then query only permitted conversation IDs. Metadata is checked before fetching titles/previews/messages/prompts/tool data or feedback aggregates. Feedback without a permitted conversation is excluded.
- Only the server appends assistant text/tool results from AI SDK completion. Old client assistant/system message POST returns 405 and performs no transcript writes. Client persistence is removed. Use the installed SDK's independent SSE consumption hook with Next `after` to continue completion handling on response disconnect, subject to host execution limits.
- Trusted in-flight appends may finish into a scope another run broadened; they may not narrow scope or write outside the scope reserved before generation. Reads always re-evaluate current module/capability availability. Existing auth/module rules remain mandatory.

## Tradeoffs and remaining work
This conservative envelope can hide a conversation even when the revoked tool was never invoked, because opaque prose/history cannot be safely reclassified from tool-use logs alone. No data is deleted, no legacy metadata is backfilled and no new schema is needed. New chat is a separate record, not a reset/delete of old history. Settings recovery stays available.

Receipt recovery remains narrower: current allowed tool outputs only, without conversation prose. Platform-wide activity/notifications and non-chat aggregate disclosure remain separate coverage work. Already returned browser data cannot be retracted, and authorization does not atomically cancel in-flight model/domain operations. Hosting timeouts, persistence failure, stream cancellation and database lock behavior need runtime verification; no durable queue or uninterrupted completion guarantee is claimed.

No tests, typechecks, builds, lint/formatters, browser/mobile checks, DB operations or schema pushes ran. Deferred cases include cross-tenant/role denial, legacy/invalid metadata, grant expansion/revocation, concurrent expansion/read/append, forged message POST, stream disconnect/persistence failure and 320/375/768px keyboard/touch behavior.
