# Academic Term Lifecycle And Rollover

## Status

Implemented: 2026-07-19

Browser verified: 2026-07-20

## Purpose

Provide one deliberate, auditable workflow for creating, preparing, activating, and closing academic terms without deleting existing academic records.

## Lifecycle

`SessionTerm.lifecycleStatus` uses:

- `DRAFT`: metadata can be edited and setup has not been completed.
- `READY`: rollover choices were applied successfully and activation checks can run.
- `ACTIVE`: the school's canonical `SchoolProfile.activeSessionTermId` points to this term.
- `CLOSED`: normal academic writes are rejected.

The lifecycle field remains nullable for legacy terms. When no canonical active pointer exists, dashboard reads retain the date-based fallback until an administrator activates a term.

## User Flow

1. An Admin creates a term draft in an existing or newly created session.
2. The setup page collects the title, dates, and optional note.
3. The rollover page loads the deterministic previous term and previews source data.
4. The Admin chooses all, selected, or empty handling for subjects, students, and teachers. Same-session classroom structure is reused; cross-session classroom structure may be copied.
5. The server recomputes the preview, reports blockers and warnings, and applies the confirmed configuration with an idempotency key.
6. A successful setup marks the target term `READY` and returns created counts.
7. Activation preview checks setup completion, dates, finance closure for the outgoing term, and cross-session student progression.
8. Activation atomically closes the previous active term, activates the target, updates the school pointer, and records an activity.
9. An active term may also be closed explicitly after its finance ledger is closed.

## Term Reset

- An Admin may preview and reset a `DRAFT` or `READY` term from the academic dashboard.
- The preview shows affected subjects, student term sheets, teacher assignments, attendance sessions, assessment access/workbook artifacts, and finance blockers.
- Reset requires the exact typed phrase `I APPROVE RESET`; the API validates the phrase independently of the modal.
- `ACTIVE` and `CLOSED` terms are protected. Any term-scoped finance record blocks reset, and accounting history is never removed.
- The reset transaction soft-deletes term-scoped academic working data, clears setup-run/workbook replay identities, returns the term to `DRAFT`, clears lifecycle completion timestamps, and writes an activity audit containing the affected counts.
- Reset also clears both the term start and end dates so the draft returns to a fully unscheduled state.
- Reset queries execute serially on Prisma's single interactive-transaction connection. The impact preview is captured before the transaction, while finance blockers are rechecked inside it without repeating the full preview. Explicit acquisition/execution limits leave time for the API to return a structured error before the Vercel request deadline.

## Term Calendar Editing

- Draft and ready terms may be saved with no start date, no end date, or either date cleared independently.
- Term creation, setup, and dashboard quick editing use the shared shadcn-style calendar with month/year dropdowns plus explicit Clear date and Today actions.
- Academic history keeps dates out of the table/card presentation. Midday-style Edit actions open one focused modal for renaming a draft/ready term or any tenant-owned session and updating or clearing its optional dates.
- When a start date exists, the calendar disables earlier end dates and the API rejects an end date before the start date.
- Rollover preparation may continue while a draft is unscheduled; activation still blocks until a start date is present.

## Academic Context Selection

- Academic session history sorts scheduled terms by start date and places unscheduled drafts at the end of each session.
- The shared header term selector lists only scheduled terms belonging to the currently selected academic session.
- The dashboard overview renders its current-term label as a mobile-friendly switcher trigger, reusing the header term menu so staff can change terms when the desktop-only selector is hidden.
- Report, payment-import, and assessment term options use the same selected-session scope and exclude unscheduled drafts.
- Academic Management provides an explicit session switch action. Switching selects that session's earliest scheduled term and refreshes the workspace context; sessions without a scheduled term remain editable but cannot become the working context.

During first-school onboarding, the standard three-term structure is prefilled.
The first term is prepared with an explicit empty source and activated before
the workflow advances to classroom setup.

Term creation passes the current session explicitly into the create sheet,
refreshes the academic dashboard cache, and navigates directly to the new
term's setup route. Calendar validation is visible and accessible.

## Teacher Semantics

- `StaffProfile` is the permanent, school-scoped teacher identity and is never duplicated by term setup.
- `StaffTermProfile` is the teacher's term assignment record. It belongs to both `schoolSessionId` and `sessionTermId`.
- New-term setup creates or reuses one target `StaffTermProfile` for each selected teacher.
- The setup copies mapped `StaffClassroomDepartmentTermProfiles`, `StaffAcademicAccessGrant` rows, and legacy `StaffSubject` links.
- Rerunning the same confirmed setup does not duplicate teacher term profiles or assignments.

## Student Semantics

- Same-session rollover may create target `StudentTermForm` rows and apply active fee histories once.
- Cross-session direct student copying is blocked because progression may change class placement.
- Cross-session setup hands the administrator to the promotion workflow; activation remains blocked when the source has students and the target has none.

## Legacy Classroom References

- Rollover resolves every classroom and department referenced by selected subjects, students, and teacher assignments, including legacy records that still point to a classroom structure from an older session.
- Referenced legacy classrooms are matched to the target session by normalized classroom and department names. The target term always writes against the target session's canonical classroom departments instead of preserving stale cross-session references.
- Same-session setup continues to reuse classroom structure without duplication, while cross-session setup can map legacy dependencies onto matching or newly copied target classrooms.

## Idempotency And Audit

- `AcademicTermSetupRun` stores tenant, source, target, idempotency key, configuration, status, result, error, actor, and timestamps.
- `(schoolProfileId, idempotencyKey)` is unique.
- A completed retry returns the stored result.
- Apply is additive. It matches existing target rows and never hard-deletes the target term's academic data.
- Same-session student rollover pre-generates target `StudentTermForm` UUIDs, loads existing target enrollments once, inserts all missing term sheets with one `createMany`, loads applicable fee definitions once, and inserts the resulting student finance charges with one `createMany`.
- The serializable apply transaction performs a lightweight source/target lifecycle recheck instead of rebuilding the complete preview. Its explicit 5-second acquisition and 50-second execution limits leave response time below Vercel's 60-second request deadline.
- Setup completion, activation, and closure emit dedicated `ActivityType` records.

## Write Protection

Closed-term guards reject:

- assessment creation, deletion, reordering, and authenticated score entry;
- signed workbook assessment imports;
- public-link score entry;
- AI assessment score entry;
- attendance creation and deletion;
- manual student enrollment into the term.

New attendance sessions store `sessionTermId` directly so closure checks and historical attribution do not depend only on their student rows.

## Key Files

- `apps/api/src/db/queries/academic-term-setup.ts`
- `apps/api/src/db/queries/academic-term-reset.ts`
- `apps/api/src/db/queries/academic-term-setup.test.ts`
- `apps/api/src/trpc/schemas/academic-term-setup.ts`
- `apps/api/src/trpc/routers/academics.routes.ts`
- `apps/dashboard/src/components/configure-term.tsx`
- `apps/dashboard/src/components/configure-term-import.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/academic/(dashboard)/page.tsx`
- `apps/dashboard/src/components/forms/academic-term-form.tsx`
- `apps/dashboard/src/components/forms/academic-session-form.tsx`
- `packages/ui/src/components/controls/form-date.tsx`
- `packages/db/src/schema/school.prisma`
- `packages/db/src/schema/staffs.prisma`
- `packages/db/src/schema/student-activity.prisma`

## Verification

- Prisma client generation passed.
- Local and production `db:push` completed successfully.
- API, dashboard, database, and AI package typechecks passed.
- Twenty-five focused tests passed across term setup/lifecycle, assessment writes, and workbook imports.
- The dashboard production build passed with the setup and progression routes included.
- A read-only integration probe against the local Daarul Hadith tenant loaded the
  real setup context, resolved its previous term, counted rollover classrooms,
  and returned the expected setup-completion activation blocker.
- The port-free tenant URL responds through Portless.
- Authenticated browser QA created a temporary term, verified current-session
  defaulting, create-to-setup navigation, required date validation, all-empty
  preview/apply, persisted receipt reuse, and missing-date/finance activation
  blockers.
- Desktop visual inspection found no overlap or layout breakage in the completed
  setup receipt.
- Browser QA removed both temporary terms, their setup run, and its audit event;
  the tenant returned to its original three sessions and nine terms.
- A 2026-07-21 regression probe against the real Daarul Hadith draft mapped 39
  legacy subject classroom references onto the current session structure. The
  preview returned zero blockers for 77 subjects, 46 assessment templates, 183
  students, and 3 teachers, and authenticated browser QA showed an enabled
  `Apply rollover` action without mutating the draft.
