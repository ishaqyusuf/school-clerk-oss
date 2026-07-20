# Attendance

## Status

Implemented and available for administrators and assigned teachers as of 2026-07-20.

## User Workflows

- Administrators open a classroom attendance sheet and choose General or Subject attendance.
- Teachers open the live `/teacher/attendance` workspace and select one of their assigned classrooms.
- Subject attendance requires an active-term subject assigned to that classroom and, for teachers, included in effective academic access.
- The recorder chooses an attendance date, title, and optional period/lesson label.
- Every student in the active classroom roster receives one status: Present, Absent, Late, Excused, Sick, or Leave.
- “Mark all present” accelerates the common case, but submission is blocked until the complete roster is marked.
- Recent sessions can be opened and corrected. Corrections replace the current active marks and increment the session revision.
- Authorized users can soft-delete a session.
- Classroom and teacher surfaces can export student-level attendance rows as CSV. Student profiles show active-term attendance history.

## Authorization And Scope

- Read: `ADMIN`, `Admin`, `Registrar`, and assigned `Teacher`.
- Write: `ADMIN`, `Admin`, and assigned `Teacher`.
- Teachers are restricted through the shared effective classroom and department-subject access resolver.
- All reads and writes are tenant-scoped and active-term-scoped.
- Closed academic terms reject attendance writes.
- Registrars can review and export but cannot create, correct, or delete.

## Data And Integrity

- A session is either `GENERAL` or `SUBJECT`; subject sessions link to `DepartmentSubject`.
- Duplicate identity is tenant + term + classroom + date + scope + subject/general marker + normalized period.
- `AttendanceSessionGuard` atomically prevents concurrent duplicate sessions and handles idempotent retries without adding destructive uniqueness constraints to historical attendance rows. A stored payload hash rejects reuse of the same idempotency key for different content.
- Create, correction, and delete operations retain revision snapshots and write attendance activity events.
- Deletion is soft and releases guard keys so an authorized replacement can be recorded.
- Existing legacy rows remain readable through compatibility defaults for date, scope, and present/absent status.

## Reporting Semantics

- Present and Late count as attended.
- Excused, Sick, and Leave are excluded from the eligible attendance-rate denominator.
- Classroom summaries expose all six status counts.
- Export rows include date, classroom, scope, optional subject/period, title, student, status, comment, and recorder.

## Validation

- Twenty-five focused attendance and teacher-access tests cover roles, active-term/legacy scoping, subject metadata, full-roster enforcement, atomic duplicate prevention, payload-bound idempotent replay, status summaries, student history, corrections, revisions, export rows, and deletion.
- API, dashboard, and database package typechecks pass.
- Prisma generation and both required local/production schema pushes pass.

## Known Follow-Ups

- Dedicated printable/PDF attendance registers and aggregate multi-class analytics are not part of the current feature.
- Offline/mobile synchronization and guardian notifications are not implemented.
