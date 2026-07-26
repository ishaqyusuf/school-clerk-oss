# Attendance

## Status

Implemented and available for administrators and assigned teachers as of 2026-07-26.

## User Workflows

- Administrators record General or Subject attendance in the `Mark attendance` sub-tab inside the classroom Attendance tab. Saved history, summaries, correction, deletion, and export are grouped in the adjacent `Sessions` sub-tab.
- The classroom overview title is a current-session classroom selector with a visible chevron-down affordance. Opening it lists the available classrooms; switching refreshes the open overview in place, preserves the selected primary classroom tab, and closes stale secondary classroom/session details.
- Teachers open the live `/teacher/attendance` workspace and select one of their assigned classrooms. The classroom and teacher recorders share the same shadcn calendar and Mark all/Mark rest bulk-action controls.
- Subject attendance requires an active-term subject assigned to that classroom and, for teachers, included in effective academic access.
- The recorder chooses an attendance date through the standard shadcn calendar, with adjacent previous/next-day controls, plus a title and optional period/lesson label.
- Every student in the active classroom roster receives one recording status: Present, Absent, or Late. Illness is recorded as Absent with `Sick` in the optional remark. Existing Excused and Leave records remain readable for historical compatibility.
- A compact bulk-action menu can mark the complete roster as Present, Absent, or Late, or mark only the remaining unmarked students while preserving statuses already chosen. The same menu can clear all marks. Submission is blocked until the complete roster is marked.
- The inline recorder combines date navigation, session details, per-student shadcn Toggle Group status controls, remarks, bulk marking, and save actions in one focused surface. Attendance type and session title share a two-column row on wider screens, while subject and optional period remain separate fields.
- On mobile, each roster entry is a touch-friendly student card with full Present, Absent, and Late labels plus a full-width optional remark. Medium and larger screens retain the compact table with `P`, `A`, and `L` controls.
- Date navigation, bulk actions, and save controls stack and fit the available width on narrow screens in both recorders. Save is icon-only through the medium breakpoint and restores its text label on large screens. Saved sessions and recorded-session details use cards on mobile and tables on medium and larger screens, avoiding horizontal page or dialog overflow.
- The administrator recorder fetches the complete active classroom roster through the attendance API before enabling save, then progressively renders the roster in 25-student chunks as the user approaches the end. The full fetched roster—not only currently rendered rows—is retained for complete-roster validation and submission.
- Selecting a status immediately shows its full title in a toast. Invalid date, title, subject, and roster state use schema-backed field errors; save failures also surface the server message inline instead of appearing as a silent no-op.
- Present, Absent, and Late use distinct green, red, and amber selected states, and the selected status applies a matching low-contrast tint to the student's row.
- Administrator attendance resolves table direction from the currently displayed student roster, falling back to the tenant's resolved academic direction when the list is empty or tied. Teacher attendance consumes the tenant direction. Student names and remarks retain their own natural inline direction, while the English P/A/L control remains LTR.
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
- Browser-safe attendance status values, recordable status values, labels, legacy normalization, and bulk-map behavior are owned by `@school-clerk/utils/attendance` and consumed by both the API and dashboard.

## Reporting Semantics

- Present and Late count as attended.
- Excused and Leave are excluded from the eligible attendance-rate denominator.
- Stored legacy `SICK` values are normalized to Absent when read and are not exposed as a separate status.
- Classroom summaries expose the supported status counts.
- Export rows include date, classroom, scope, optional subject/period, title, student, status, comment, and recorder.

## Validation

- Twenty-four focused API/UI attendance tests cover schema field errors, roles, active-term/legacy scoping, complete-roster loading and enforcement, the three recordable statuses, mark-all and mark-rest bulk behavior, legacy Sick-to-Absent normalization, subject metadata, atomic duplicate prevention, payload-bound idempotent replay, status summaries, student history, corrections, revisions, export rows, deletion, and populated responsive session rendering.
- Dashboard, database, and shared-utils package typechecks pass. The broader API typecheck remains blocked by pre-existing academic-term reset/setup errors outside attendance, and the repository-wide Turbo typecheck still reaches pre-existing Jobs/shared strictness failures.
- The dashboard production build compiles successfully, then page-data collection fails because the verification environment does not provide `DATABASE_URL` or a non-default `BETTER_AUTH_SECRET`.
- Initial browser QA for the 2026-07-26 classroom attendance repair was blocked because no School Clerk stack was running and the required cmux launcher was unavailable. Follow-up responsive QA completed against the authenticated shared stack at 320 × 800, 390 × 844, and 1280 × 900: the recorder, responsive session summary, empty sessions state, desktop table, status selection, and remark entry were verified with no document or classroom-dialog horizontal overflow. Because all active classrooms had zero saved sessions, populated saved-session and recorded-session layouts were covered with focused server-rendered component fixtures instead of creating school attendance data.
- Follow-up status simplification QA verified exactly three status controls per student at 320 × 800 and 1280 × 900, no Sick control, Absent selection with a `Sick` remark, and no mobile or desktop dialog overflow.
- Follow-up recorder-control QA at 320 × 800 and 1280 × 900 verified the shadcn calendar opens and selects a date, `Mark rest as Absent` preserves an existing Late mark while filling six unmarked students, Save is a 36 px icon-only control on mobile and restores its label on desktop, and neither the page nor classroom dialog overflows horizontally.
- The repository-wide Bun suite completed with 333 passing tests; its six existing failures and one Playwright configuration error remain outside attendance.

## Known Follow-Ups

- Dedicated printable/PDF attendance registers and aggregate multi-class analytics are not part of the current feature.
- Offline/mobile synchronization and guardian notifications are not implemented.
