# Assessment Score Value History

## Status

Implemented on 2026-07-18.

## Purpose

Preserve an append-only record whenever an assessment value is created, updated, re-saved, or cleared through a supported score-entry path.

## Supported Write Sources

- Authenticated assessment recording
- Approved public assessment-recording links
- Assessment workbook import
- Authorized AI assessment tools

All four paths use the shared `saveStudentAssessmentScoreWithHistory` database helper. The helper saves the canonical `StudentAssessmentRecord` and appends one `StudentAssessmentRecordHistory` row inside the caller's transaction.

## Recorded Data

- Tenant, student, term-form, assessment, and current score-row identities
- Previous and new values
- `CREATE` or `UPDATE`
- Write source
- Actor user id/name when available
- Source reference and bounded metadata when available
- Immutable creation timestamp

History is intentionally created for same-value saves so it records the fact that a user or system submitted the value. An explicit score clear records `newObtained = null`.

## Integrity And Scope

- History creation is atomic with the canonical score write; either both succeed or neither succeeds.
- Current score reads continue to use `StudentAssessmentRecord`.
- History rows retain scalar identity snapshots if a canonical score row is later hard-deleted.
- Existing score rows are not backfilled.
- This feature provides durable persistence only; a history viewer or history-read API is a separate product feature.
