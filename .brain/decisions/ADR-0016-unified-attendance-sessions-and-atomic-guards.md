# ADR-0016: Unified Attendance Sessions And Atomic Guards

## Status

Accepted - 2026-07-20

## Context

The legacy attendance model stored a title, classroom, optional term, and boolean present/absent rows. It did not distinguish a general register from a subject lesson, did not store an explicit attendance date or period, had no correction audit history, and could accept concurrent duplicate submissions.

Adding unique constraints directly to existing attendance columns would require a production data-loss override because historical rows may contain duplicate or null values. The system also needs legacy rows to remain readable.

## Decision

- Use one `ClassRoomAttendance` aggregate for both `GENERAL` and `SUBJECT` sessions.
- Require a `DepartmentSubject` only for subject attendance.
- Store explicit date, optional period label, six-state student status, and active-term attribution while retaining legacy boolean compatibility.
- Validate the complete active classroom roster on every create or correction.
- Define duplicate identity as tenant, term, classroom, date, scope, subject/general marker, and normalized period.
- Claim idempotency and duplicate keys in the new `AttendanceSessionGuard` table within the same transaction as session creation.
- Keep guard ownership as scalar attendance ids and release guards on soft deletion.
- Store append-only `AttendanceSessionRevision` snapshots for create, correction, and deletion.
- Authorize teachers through the shared effective academic-access resolver and derive tenant/term exclusively from authenticated context.

## Consequences

- General and subject attendance share reporting, correction, audit, and compatibility behavior.
- Concurrent submissions are serialized without forcing uniqueness changes across historical attendance rows.
- Old attendance remains readable without a backfill; new writes use the richer contract.
- Correction retains soft-deleted prior student marks and a before/after revision snapshot.
- A future audit UI can expose persisted revisions without changing the write model.
- Aggregate cross-class analytics, printable registers, offline capture, and notification automation remain separate future features.
