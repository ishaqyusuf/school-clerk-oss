# ADR-0010: Signed Assessment Workbook Round Trip

- Status: Accepted
- Date: 2026-07-18

## Context

Assessment staff need a spreadsheet round trip that preserves the supplied boys/girls classroom format, supports RTL academic data, includes existing scores, and can update records without trusting names, labels, or AI inference. Uploads are untrusted bulk-write inputs and may be stale relative to online edits.

## Decision

Use a focused `@school-clerk/assessment-workbooks` package with a browser-safe root entry and a server-only ExcelJS/cryptography entry. Generate one protected `.xlsx` visible sheet plus one `veryHidden` signed metadata sheet. Persist every export identity.

Verification uses stable tenant, term, classroom, student-term-form, department-subject, and assessment ids plus original score snapshots. The API revalidates tenant and current teacher/admin access on download, preview, and apply. Preview performs deterministic literal-number normalization and three-way score comparison without writes.

Preview signs a confirmation token over the workbook digest, normalized column resolutions, explicit assessment-creation list, and exact live write plan. Apply rebuilds that plan inside a serializable Prisma transaction and requires the same token. It may create reviewed standalone assessments for Bare Subject Columns or missing original assessments and upsert safe score changes in that same transaction. Signed source scores remain the reader-facing download snapshot while replacement-target state is used only as an internal comparison baseline. Duplicate assessment targets, a stale preview, unresolved column, invalid score, conflict, stale populated row, permission failure, or structural failure abort all writes. A tenant-scoped idempotency key plus file digest and durable import record protects retries, while current access is still rechecked before a replay response.

## Consequences

- Workbook labels may be translated or edited without becoming identity.
- Concurrent online score edits are protected instead of overwritten.
- Imports remain synchronous and bounded to one classroom workbook; a durable worker can be introduced later if measured transaction limits require it.
- Production deployments must provide `ASSESSMENT_WORKBOOK_SIGNING_SECRET`.
- Custom/legacy spreadsheets are intentionally unsupported.
- Database rollout adds export/import audit tables and activity types.
