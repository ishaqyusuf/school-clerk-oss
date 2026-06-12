# Progress

## Admin Empty Classroom Report Spreadsheet Print (2026-06-12)

### Completed
- Added client-side role checks using the `useAuth` hook in [classroom-result-table.tsx](file:///Users/M1PRO/Documents/code/school-clerk/apps/dashboard/src/components/classroom-result-table.tsx).
- Gated the new "Print Empty Sheet" action to users with the `ADMIN` role.
- Implemented the `printEmptySpreadsheet` callback to render student names and assessment/subject headers while keeping all score, total, grand total, and percentage cells empty for manual paper record-keeping.
- Developed a professional paper-friendly print layout in landscape mode with a polished double-bordered school header, metadata grid (Classroom, Session, Term, Print Date, and Mode), and repeated table headers on page break.
- Preserved the existing filled "Print Spreadsheet" and "Export Excel" functionalities completely unchanged.

### Changed Files
- [classroom-result-table.tsx](file:///Users/M1PRO/Documents/code/school-clerk/apps/dashboard/src/components/classroom-result-table.tsx) — Added `useAuth` integration, configs import, admin-only button, and blank print callback.

### Verification
- Dashboard typecheck run successfully with no new errors in the changed file.

## Staff Classroom Report Sheet Access (2026-06-12)

### Completed
- Added `allowedClassroomIds` prop to `StudentReportFilter` to constrain classroom dropdown
- Created `TeacherReportSheet` client component wrapping `ReportPageProvider`, `StudentReportFilter`, and `ClassroomResultTable`
- Updated teacher reports page (`/teacher/reports`) to render the full classroom report sheet with classroom constraint
- Updated academic reports page (`/academic/reports`) from "Coming soon" to the report sheet workflow (no classroom constraint for admin staff)
- Teacher authorization for classroom access preserved via existing `assertTeacherCanAccessClassroomDepartment` in `report-sheet.ts`
- Score editing, assessment management, print, export, and filter controls all reused from existing `ClassroomResultTable` without duplication

### Changed Files
- `apps/dashboard/src/components/student-report-filters.tsx` — added `allowedClassroomIds` prop
- `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — new reusable report sheet shell
- `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — wired to report sheet
- `apps/dashboard/src/app/[domain]/(sidebar)/academic/reports/page.tsx` — replaced "Coming soon"

### Verification
- Dashboard and API typechecks run; no new errors in changed files
- Pre-existing type errors in unrelated files (finance, Prisma client compat, sidebar) remain as documented in `brain/tasks/in-progress.md`

### Fix 1 (2026-06-12) — Classroom Default Selection & Invalid State Guard
- `TeacherReportSheet` now seeds `departmentId` to first assigned classroom on mount when no classroom is selected
- Invalid `departmentId` (not in allowed list) is automatically cleared or replaced with first assigned classroom
- Teachers with zero assigned classrooms get an empty classroom dropdown (not unrestricted)
- Result Entry link is hidden when classroom or term is missing/invalid
- Changed files:
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — split inner/outer for provider context, added seed/clear effects
  - `apps/dashboard/src/components/student-report-filters.tsx` — added `isResultEntryAllowed` guard
  - `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — always passes array (no `undefined` fallback)

### Fix 2 (2026-06-12) — Restore Default Term Query-State Seeding
- Restored `termId` seeding from `defaultTermId` into `filters.termId` in `TeacherReportSheetInner`
- Term seed runs before classroom seed; both apply on first mount
- Result Entry link now appears when valid classroom + default term are present
- `TeacherReportSheet` now seeds `departmentId` to first assigned classroom on mount when no classroom is selected
- Invalid `departmentId` (not in allowed list) is automatically cleared or replaced with first assigned classroom
- Teachers with zero assigned classrooms get an empty classroom dropdown (not unrestricted)
- Result Entry link is hidden when classroom or term is missing/invalid
- Changed files:
  - `apps/dashboard/src/components/teachers/teacher-report-sheet.tsx` — split inner/outer for provider context, added seed/clear effects
  - `apps/dashboard/src/components/student-report-filters.tsx` — added `isResultEntryAllowed` guard
  - `apps/dashboard/src/app/[domain]/(sidebar)/(k-12-teachers)/teacher/reports/page.tsx` — always passes array (no `undefined` fallback)


### Review Approval (2026-06-12)
- Codex reviewed Fix 2 and approved Staff Classroom Report Sheet Access.
- Queue item approved: `/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-school-clerk-staff-report-sheet-access.json`
- Review file: `brain/reviews/2026-06-12-staff-classroom-report-sheet-access-review-v3.md`
- Active fix handoff moved to: `brain/handoffs/completed/2026-06-12-staff-classroom-report-sheet-access-fix-2.md`
- Remaining caveat: full dashboard/API typechecks still have known unrelated baseline failures; focused code review and `git diff --check` passed.

### Fix (2026-06-12) — Admin Empty Print: Role Gate Fix
- Expanded `isAdmin` gate in `classroom-result-table.tsx` from `role === "ADMIN"` (SaaS owner only) to `role === "ADMIN" || role === "Admin"` (owners + school admins)
- Code inspection confirms: blank cells regardless of existing scores, filled print unchanged, non-admin gate working, landscape print CSS, proper school/classroom/term/date/mode header
- Full browser/print verification pending stable dev server with test data
