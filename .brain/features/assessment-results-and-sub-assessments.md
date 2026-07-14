# Assessment Results and Sub-Assessments

## Goal

Make classroom assessment recording, classroom result review, student result printouts, and PDF result generation consistent when assessments can be standalone items or grouped into sub-assessments.

## Users

- School admins configure assessment structures and print rules.
- Teachers record student scores.
- Result/report users review classroom score tables.
- Parents receive printed/PDF student results.
- External helpers may record scores through an approved public assessment-recording link when a school intentionally shares one.

## Flow

- Standalone assessments are scoreable directly.
- Grouped parent assessments are containers and should not receive direct student scores.
- Sub-assessment children under a grouped parent are scoreable.
- Recording screens should show scoreable items, including sub-assessment children.
- Student result print/PDF should show printable weighted columns only.
- Grouped assessments should support two print modes:
  - Expanded: print weighted child columns as `Parent - Child`.
  - Total only: print one parent column using the summed weighted child scores.

## Data Model

- Existing fields:
  - `ClassroomSubjectAssessment.isGroup` marks grouped parent rows.
  - `ClassroomSubjectAssessment.parentAssessmentId` links child rows to a parent.
  - `ClassroomSubjectAssessment.percentageObtainable` is the report/print weight.
  - `ClassroomSubjectAssessment.obtainable` is the raw score maximum.
  - `ClassroomSubjectAssessment.index` controls display order.
- `ClassroomSubjectAssessment.printMode` stores the grouped parent result-print behavior as `EXPANDED` or `TOTAL`, defaulting to `EXPANDED`.
- Optional future field:
  - `printOnResult` if schools need to hide a weighted item from print without setting weight to zero.
- Public assessment-recording links use `AssessmentPublicLink`:
  - Stores tenant, term, classroom/department, lifecycle status, expiry, signed-token hash, captured subject filter, optional student filter, request reason, admin rejection note, and requester/admin audit names.
  - Supports direct admin-created links and staff-requested links that require admin approval before a URL is issued.
  - The plaintext token is only returned at creation/approval time; persisted records store `tokenHash`.

## APIs

- `assessments.getClassroomReportSheet` should return subjects for the selected classroom and selected term.
- Result/report queries should preserve assessment order by `index`.
- Report data should expose enough structure to distinguish standalone assessments, grouped parents, and children.
- Score recording mutations should only update scoreable assessments.
- Assessment mutation routes should verify child ownership before updating or deleting child IDs.
- Public link routes should expose only the classroom report sheet subset captured by the link's current filters.
- Public score mutation routes should validate the token, status, expiry, classroom, term, subject, student term form, and scoreable assessment before writing.

## UI/UX Notes

- Assessment form should show a grouped-assessment print mode control:
  - Print sub-assessments
  - Print group total only
- Student result print/PDF headers should show the full classroom display name for each student, including the main classroom and department/arm when both are available.
- Student report unavailable states should offer a CTA into the existing classroom overview sheet, opening the Subjects tab so staff can review classroom setup and assessments without leaving the report page.
- Classroom result tables should include a Classroom Overview CTA that opens the existing classroom overview side sheet on the Students tab while preserving the current report filters.
- Standalone assessments with no weight should show a warning: they can be recorded but will not print.
- Grouped assessments whose children have no printable weight should show a warning: the group will not appear on printed results.
- Assessment list should show badges for:
  - No print
  - Print expanded
  - Print total only
  - 0% weight
- The assessment create/edit form should show live print-status badges and warnings from the current weight/sub-assessment values.
- Saved assessment rows should show print-status badges and warnings so admins can audit printable result behavior without opening each assessment.
- Printable labels should include parent context for expanded child columns, for example `Exam - Oral`.
- Assessment recording, classroom result review, CSV export, and print spreadsheet headers use the same parent-aware assessment labels.
- A print preview inside the assessment manager shows the exact weighted columns that will appear on result printouts for the current subject.

## Print Rules

- Standalone assessment with `percentageObtainable > 0`: print as a column.
- Standalone assessment with no weight or zero weight: do not print as a column.
- Subjects with no printable assessment columns are hidden from printed/PDF student results.
- Grouped parent assessment: never print as a directly scored parent row.
- Grouped assessment with `printMode = expanded`: print weighted children only.
- Grouped assessment with `printMode = total`: print one parent total column if summed child weight is greater than zero.
- Child assessment with no weight or zero weight: do not print as a column.
- Authenticated and public score-entry routes must write only to non-group scoreable assessment rows.
- Assessment setup rejects child assessment IDs that do not already belong to the grouped parent being edited.
- Recording/classroom review may still show zero-weight scoreable items when they are useful for internal tracking.
- Assessment recording defaults to the first loaded subject when no explicit subject is selected, while preserving explicit `deptSubjectId` deep links.
- Assessment recording score-entry tables show editable assessment cells only; subject total columns are reserved for classroom result review rather than score entry.
- Assessment recording supports bare `/assessment-recording` links by auto-selecting a default term/classroom when one can be resolved instead of showing an inline context selector.
- Assessment recording resolves a missing `termId` from the workspace-selected term, then the date-current term. For teacher users, if the date-current term has no assigned classrooms but another assigned term does, the page defaults to the first assigned term with classrooms. If no date-current/default term can be inferred, it opens a current-term modal and persists the user choice to the session profile cookie.
- Teacher assessment recording is scoped by staff assignments: Teacher users only see terms from their non-deleted `StaffTermProfile` rows and classrooms from their `StaffClassroomDepartmentTermProfiles` for the selected term. Invalid teacher deep links auto-correct to a valid scoped default when available.
- Assessment recording setup states show the term/classroom filters plus a current-selection summary instead of a bare unavailable message. Admin users can open the selected classroom overview side sheet on the Subjects tab from setup and no-student states to fix classroom subjects, students, or assessments without leaving score entry.
- The assessment recording header hides the `Report Sheet` shortcut for staff-facing roles; it remains an admin-only shortcut from the recording screen.
- The classroom context selector belongs inside the assessment recording table header beside the subject filter, not in a fixed viewport header, so classroom and subject filtering live in one control cluster.
- Assessment recording score cells keep a fixed column width in display and edit modes so focusing an input does not resize the assessment column.
- Assessment recording and classroom result review rosters share the same default student ordering: `Male` students first, then `Female` students, then alphabetic display names within each gender group.
- Authenticated assessment recording and classroom result review tables include a compact Gender column near the student identity columns. Users with student-management permission can update gender from the table, and the report query is invalidated/refetched so the corrected gender and roster position refresh together.
- Classroom result review surfaces report-sheet query failures as a visible error state with retry and classroom-overview recovery actions instead of leaving users on an indefinite loading spinner. Report filters stack on the narrowest mobile viewports to prevent label/control collisions, then render side by side from the small-screen breakpoint upward.
- The subject assessment editor modal uses a flat tool-panel layout: no nested card shell, flat assessment rows, and simple bordered stat/form sections.
- The subject assessment editor `Record submission` action opens `/assessment-recording` with `termId`, `deptId`, and `deptSubjectId` prefilled so the score-entry table is filtered to that subject.
- Dashboard current-term selection is date-aware: terms with no start date are not considered current; terms whose start/end span today are preferred; started terms without an end date are the fallback current term.
- **Blank Manual Spreadsheet Print**:
  - Admins can print blank classroom spreadsheets containing active students and configured subject/assessment columns.
  - All score cells, totals, grand totals, and percentage fields must render blank for manual record keeping.
  - Print layout is optimized for landscape paper with double-bordered school headers (Arabic/English), classroom meta details, and print date.
  - Restricted to authenticated `ADMIN` SaaS owners and title-case `Admin` staff admins on the dashboard interface.
- **Public Assessment Recording Links**:
  - The assessment-recording toolbar exposes a public-link panel for the selected classroom, term, and subject filter.
  - Admins can generate an approved link immediately, choose expiry duration presets such as 24 hours, 2 days, or 7 days, copy active URLs, revoke active links, and approve/reject pending staff requests.
  - Non-admin staff can request a link for their authorized classroom/subject scope by choosing an expiry duration and writing a reason.
  - Approved/rejected staff requests notify the requester; new staff requests notify admins.
  - Admin review-request email CTAs use the tenant dashboard host in production, `dashboard.{tenant}.school-clerk.com`, while in-app notification links stay app-relative.
  - The public recording page reuses the assessment-recording table without admin-only subject-management controls.

## Recommended PDF Patterns

- Default parent-facing PDF should prefer grouped total-only columns for clean output.
- Expanded columns should be available when schools want parents to see each sub-assessment.
- Summary-first printout is preferred for polished reports:
  - Student/class/term header
  - Overall total, percentage, position, comment
  - Subject breakdown
  - Detailed scores

## Edge Cases

- A grouped parent with no children is invalid.
- A grouped parent with children whose total weight is zero is valid for recording but should not print.
- Duplicate visible printable labels should be warned against or prevented.
- Editing weights after scores exist should warn that printed totals will be recalculated.
- Deleted assessments are soft-deleted; restore support is a future improvement.
- Empty score means no score, not zero.
- Obtained score above obtainable should warn or be blocked depending on school policy.
- Expired, revoked, pending, rejected, malformed, or tampered public links should show a blocked public-recording state and must not allow score writes.
- Public links with subject filters that no longer resolve should not broaden to all subjects; they should fail closed or show an empty scoped sheet.

## Metrics

- Count of printable assessment columns per subject.
- Count of scoreable items per subject.
- Count of zero-weight/no-print items.
- Total printable weight per subject.
- Number of result printouts generated after assessment structure changes.

## Open Questions

- Should total subject printable weight be required to equal 100%, or only warned when it does not?
- Should zero-weight assessments remain visible in classroom result review, or only in recording screens?
