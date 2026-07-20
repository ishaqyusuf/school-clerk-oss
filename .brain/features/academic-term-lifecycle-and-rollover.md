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

During first-school onboarding, the standard three-term structure is prefilled.
The first term is prepared with an explicit empty source and activated before
the workflow advances to classroom setup.

Term creation passes the current session explicitly into the create sheet,
refreshes the academic dashboard cache, and navigates directly to the new
term's setup route. Required calendar validation is visible and accessible.

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

## Idempotency And Audit

- `AcademicTermSetupRun` stores tenant, source, target, idempotency key, configuration, status, result, error, actor, and timestamps.
- `(schoolProfileId, idempotencyKey)` is unique.
- A completed retry returns the stored result.
- Apply is additive. It matches existing target rows and never hard-deletes the target term's academic data.
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
- `apps/api/src/db/queries/academic-term-setup.test.ts`
- `apps/api/src/trpc/schemas/academic-term-setup.ts`
- `apps/api/src/trpc/routers/academics.routes.ts`
- `apps/dashboard/src/components/configure-term.tsx`
- `apps/dashboard/src/components/configure-term-import.tsx`
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
