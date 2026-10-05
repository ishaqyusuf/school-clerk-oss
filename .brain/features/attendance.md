# Attendance

## Status

Implemented and available for administrators and assigned teachers as of 2026-07-26.

## User Workflows

- Administrators record General or Subject attendance in the `Mark attendance` sub-tab inside the classroom Attendance tab. Saved history, summaries, correction, deletion, and export are grouped in the adjacent `Sessions` sub-tab.
- The classroom overview title is a current-session classroom selector with a visible chevron-down affordance. Opening it lists the available classrooms; switching refreshes the open overview in place, preserves the selected primary classroom tab, and closes stale secondary classroom/session details.
- Teachers open the live `/teacher/attendance` workspace and select one of their assigned classrooms. The selected classroom renders the same shared `Mark attendance` and `Sessions` UI used in the administrator classroom Attendance tab, including the responsive roster, session summaries, export, correction, and deletion controls. Session review and correction open in a standalone dialog because the teacher route does not use the administrator classroom overview sheet.
- Subject attendance requires an active-term subject assigned to that classroom and, for teachers, included in effective academic access.
- The recorder chooses an attendance date through the standard shadcn calendar, with adjacent previous/next-day controls, plus a title and optional period/lesson label.
- Marked students receive one recording status: Present, Absent, or Late. Unmarked students remain unmarked and are omitted from saved rows. At least one mark is required; completing the roster is optional. The optional remark field appears only after Absent or Late is selected; Present students do not show or submit a remark. Illness is recorded as Absent with `Sick` in the optional remark. Existing Excused and Leave records remain readable for historical compatibility.
- A compact bulk-action menu can mark the complete roster as Present, Absent, or Late, or mark only the remaining unmarked students while preserving statuses already chosen. The same menu can clear all marks. Partial registers can be saved.
- The inline recorder combines date navigation, session details, per-student shadcn Toggle Group status controls, conditional remarks, bulk marking, and save actions in one focused surface. Attendance type and session title share a two-column row on wider screens, while subject and optional period remain separate fields.
- On mobile, each roster entry is a touch-friendly student card with full Present, Absent, and Late labels plus a full-width optional remark when Absent or Late is selected. Medium and larger screens retain the compact table with `P`, `A`, and `L` controls.
- Date navigation, bulk actions, and save controls stack and fit the available width on narrow screens in both administrator and teacher entry points. Save is icon-only through the medium breakpoint and restores its text label on large screens. Saved sessions and recorded-session details use cards on mobile and tables on medium and larger screens, avoiding horizontal page, sheet, or dialog overflow.
- The shared recorder fetches the complete active classroom roster through the attendance API before enabling save, then progressively renders the roster in 25-student chunks as the user approaches the end. The full fetched roster retains all chosen marks across render batches; submission includes only marked students for both administrators and teachers.
- Administrators can use `Add student` from the classroom inline recorder to open the existing secondary registration sheet. It preselects the classroom/session/term and retains the shared name lookup, enrollment suggestions and fee preview. Creating or enrolling closes the secondary sheet, refreshes the attendance roster and classroom counts, and preserves the attendance draft. Newly added students are included in the rendered roster immediately after refresh.
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

- Focused API/UI attendance tests cover schema field errors, roles, active-term/legacy scoping, complete-roster loading, partial create/correction, empty-register rejection and submitted-roster membership, the three recordable statuses, conditional Absent/Late remarks, mark-all and mark-rest bulk behavior, legacy Sick-to-Absent normalization, subject metadata, atomic duplicate prevention, payload-bound idempotent replay, status summaries, student history, corrections, revisions, export rows, deletion, and populated responsive session rendering.
- Dashboard, database, and shared-utils package typechecks pass. The broader API typecheck remains blocked by pre-existing academic-term reset/setup errors outside attendance, and the repository-wide Turbo typecheck still reaches pre-existing Jobs/shared strictness failures.
- The dashboard production build compiles successfully, then page-data collection fails because the verification environment does not provide `DATABASE_URL` or a non-default `BETTER_AUTH_SECRET`.
- Initial browser QA for the 2026-07-26 classroom attendance repair was blocked because no School Clerk stack was running and the required cmux launcher was unavailable. Follow-up responsive QA completed against the authenticated shared stack at 320 × 800, 390 × 844, and 1280 × 900: the recorder, responsive session summary, empty sessions state, desktop table, status selection, and remark entry were verified with no document or classroom-dialog horizontal overflow. Because all active classrooms had zero saved sessions, populated saved-session and recorded-session layouts were covered with focused server-rendered component fixtures instead of creating school attendance data.
- Follow-up status simplification QA verified exactly three status controls per student at 320 × 800 and 1280 × 900, no Sick control, Absent selection with a `Sick` remark, and no mobile or desktop dialog overflow.
- Follow-up recorder-control QA at 320 × 800 and 1280 × 900 verified the shadcn calendar opens and selects a date, `Mark rest as Absent` preserves an existing Late mark while filling six unmarked students, Save is a 36 px icon-only control on mobile and restores its label on desktop, and neither the page nor classroom dialog overflows horizontally.
- The 2026-08-09 teacher attendance parity refactor now renders the shared classroom attendance surface behind the assigned-classroom selector. Eight focused attendance UI/utility tests pass. Browser QA remains pending because no School Clerk stack was active and the repository-required `cmux` launcher was unavailable, so an alternate development server was not started.
- The repository-wide Bun suite completed with 333 passing tests; its six existing failures and one Playwright configuration error remain outside attendance.

## Known Follow-Ups

- Dedicated printable/PDF attendance registers and aggregate multi-class analytics are not part of the current feature.
- Offline/mobile synchronization and guardian notifications are not implemented.

## Teacher registration review integration — 2026-09-27

Pending teacher-submitted students enter the active classroom attendance
roster immediately. Rejected submissions leave prior attendance rows intact
but no longer appear in active roster or session recording reads. See
[teacher student registration approval](teacher-student-registration-approval.md).

## Quick-add and partial-save validation — 2026-10-05

Authenticated administrator QA passed in Daarul Hadith, class الثاني الإعدادي, session 1447/1448. Creating `QA Attendance OctFive Test` and enrolling the existing suggestion `أشرف محمد` each closed the secondary form and immediately refreshed the attendance list and classroom count (7 → 8 → 9), without manual reload. Existing draft marks/title survived enrollment. A QA attendance session saved successfully with only one of nine students marked Present; the other eight remained unmarked.

The recorder displays sequential row numbers in its desktop No. column and beside mobile names. At 390 × 844 the roster and secondary form fit the viewport without horizontal overflow. Student date-of-birth uses the installed shadcn Drawer below 768 px, retaining the desktop popover. Mobile year/date selection closes the calendar and updates the field; Cancel preserves the selected date. Desktop popover and dismissal were verified at 1280 × 900.

35 focused registration/attendance API, roster, session-list and utility tests pass. Narrow frontend compilation passes. Broad typecheck remains blocked by existing Prisma/shared UI diagnostics outside the changed controls; no diagnostics appear in the touched attendance, student form, registration policy or FormDate components. Local QA student, existing-student enrollment and partial attendance session remain for review. No production data or schema changed. See ADR-0064 and ADR-0065.

## Shared compact calendars — 2026-10-05

Calendar presentation now comes from shared CalendarPopover: shadcn bottom sheet on mobile and popover on desktop. FormDate defaults to this behavior everywhere; attendance, date ranges and date filters reuse it. Shared native date Inputs also open the mobile sheet while retaining form events/constraints. Mobile layout uses more width, larger day buttons and tighter header/week/footer spacing. Date ranges show one month on mobile. See ADR-0066 for boundaries and verification.
