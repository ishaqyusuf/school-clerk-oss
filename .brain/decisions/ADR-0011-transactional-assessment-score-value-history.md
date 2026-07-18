# ADR-0011: Transactional Assessment Score Value History

- Status: Accepted
- Date: 2026-07-18

## Context

Assessment values can be written through authenticated score entry, approved public links, workbook imports, and AI tools. Keeping only the current `StudentAssessmentRecord.obtained` value does not preserve who changed a value, how it was changed, or its prior value.

## Decision

- Store an append-only `StudentAssessmentRecordHistory` row for every normal assessment score create or update.
- Route all supported score writes through one shared database helper.
- Create the canonical score and its history row inside the same transaction.
- Record previous/new values, create/update type, source, available actor provenance, optional source reference, and immutable identity snapshots.
- Record same-value saves and explicit clears.
- Keep the current score table canonical; do not derive present results by replaying history.
- Do not backfill history for values that existed before this feature.

## Consequences

- A history failure prevents the canonical score mutation from committing.
- Every normal score-write boundary must use the shared helper.
- History can survive current-row hard deletion because the record relation is nullable and uses `SetNull`.
- A future read API or viewer can be added without changing the write contract.
