# Attendance

## Status

Implemented and available for administrators and assigned teachers as of 2026-07-26.

## User Workflows

- Administrators record General or Subject attendance in the `Mark attendance` sub-tab inside the classroom Attendance tab. Saved history, summaries, correction, deletion, and export are grouped in the adjacent `Sessions` sub-tab.
- The classroom overview title is a current-session classroom selector. Switching it refreshes the open overview in place, preserves the selected primary classroom tab, and closes stale secondary classroom/session details.
- Teachers open the live `/teacher/attendance` workspace and select one of their assigned classrooms.
- Subject attendance requires an active-term subject assigned to that classroom and, for teachers, included in effective academic access.
- The recorder chooses an attendance date, title, and optional period/lesson label.
- Every student in the active classroom roster receives one recording status: Present, Absent, Late, or Sick. Existing Excused and Leave records remain readable for historical compatibility.
- “Mark all present” accelerates the common case, but submission is blocked until the complete roster is marked.
- The inline recorder combines date navigation, session details, per-student shadcn Toggle Group status controls, remarks, bulk marking, and save actions in one focused surface. Attendance type and session title share a two-column row on wider screens, while subject and optional period remain separate fields.
- On mobile, each roster entry is a touch-friendly student card with full Present, Absent, Late, and Sick labels plus a full-width optional remark. Medium and larger screens retain the compact table with `P`, `A`, `L`, and `S` controls.
- Date navigation, bulk actions, and save controls stack and fill the available width on narrow screens. Saved sessions and recorded-session details use cards on mobile and tables on medium and larger screens, avoiding horizontal page or dialog overflow.
- The administrator recorder fetches the complete active classroom roster through the attendance API before enabling save, then progressively renders the roster in 25-student chunks as the user approaches the end. The full fetched roster—not only currently rendered rows—is retained for complete-roster validation and submission.
- Selecting a status immediately shows its full title in a toast. Invalid date, title, subject, and roster state use schema-backed field errors; save failures also surface the server message inline instead of appearing as a silent no-op.
- Present, Absent, Late, and Sick use distinct green, red, amber, and blue selected states, and the selected status applies a matching low-contrast tint to the student's row.
- Administrator attendance resolves table direction from the currently displayed student roster, falling back to the tenant's resolved academic direction when the list is empty or tied. Teacher attendance consumes the tenant direction. Student names and remarks retain their own natural inline direction, while the English P/A/L/S control remains LTR.
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
- `getAttendanceRoster` is the canonical attendance-capture roster read. It is tenant-, active-term-, classroom-, role-, and teacher-assignment-scoped and deliberately returns the complete roster in one response so client pagination cannot produce an incomplete write.
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

- Twenty focused API/UI attendance tests cover schema field errors, roles, active-term/legacy scoping, complete-roster loading and enforcement, subject metadata, atomic duplicate prevention, payload-bound idempotent replay, status summaries, student history, corrections, revisions, export rows, deletion, and populated responsive session rendering.
- Dashboard and database package typechecks pass. The broader API typecheck remains blocked by pre-existing academic-term reset/setup errors outside attendance.
- The dashboard production build compiles successfully, then page-data collection fails because the verification environment does not provide `DATABASE_URL` or a non-default `BETTER_AUTH_SECRET`.
- Initial browser QA for the 2026-07-26 classroom attendance repair was blocked because no School Clerk stack was running and the required cmux launcher was unavailable. Follow-up responsive QA completed against the authenticated shared stack at 320 × 800, 390 × 844, and 1280 × 900: the recorder, responsive session summary, empty sessions state, desktop table, status selection, and remark entry were verified with no document or classroom-dialog horizontal overflow. Because all active classrooms had zero saved sessions, populated saved-session and recorded-session layouts were covered with focused server-rendered component fixtures instead of creating school attendance data.

## Known Follow-Ups

- Dedicated printable/PDF attendance registers and aggregate multi-class analytics are not part of the current feature.
- Offline/mobile synchronization and guardian notifications are not implemented.
