# Classroom overview sheet

Opens from the Classrooms table (`?viewClassroomId=…&classroomTab=…`). The layout is a section rail with details opening in place. See [ADR-0078](../decisions/ADR-0078-classroom-section-rail.md).

## Layout

- **Rail (desktop)**:
  - The class switcher, which keeps the current section and clears open details, the attendance session and the attendance view.
  - The term label.
  - The sections with one live metric each:
    - Students: enrolled count for the term (from the duplicate check's `totalStudents`; the overview `_count` spans the whole session) and duplicate groups.
    - Attendance: average % and whether today's attendance is taken.
    - Subjects: count, and how many have weights that don't total 100%.
    - Payments: outstanding ₦, "Finance not enabled" when the school lacks Billing & Finance (no charges request is sent), or "Unavailable" when charges can't be read.
    - Performance: coming soon.
  - Close.
- **Phone and tablet**: a top bar with the switcher and Close, and a scrollable row of section chips.
- **Details**: student form, subject workspace, attendance session and correction replace the section page. Back is labelled with the section name, and the sheet never widens. Switching section or class also clears the subject workspace's URL params.
- **Deep links**: `classroomTab` null or `overview` falls back to Students.

## Sections

| Section | Page |
| --- | --- |
| Students | One context line ("N enrolled this term"), **Add student**, one amber row per duplicate group with **Review merge**, a class-local search, and the shared students table (row menu, bulk bar, Export CSV). The table runs with `filterMode="local"`, so the Students page's URL filters never apply here. |
| Attendance | One summary line (sessions, % attended, % absent), Export CSV, a Today card (**Take attendance** / **Take another**), and the session list. Delete is Admin only. `attendanceView=take` opens the recorder page with a back link. |
| Subjects | **Add subject** (inline form, resets after save), ⋯ → Import from catalog, and subject rows (assessment count, amber when none). Delete is Admin only. The workspace has **Assessments** and **Score entry** tabs. |
| Payments | One summary line, a collection progress bar, charges sorted by outstanding, **Record**, and **Receive payment**. Rows open the student. A "Finance is turned off" state appears when Billing & Finance is off, and an error state when charges can't be loaded. `ClassroomPaymentsView` is presentational and fixture-tested. |
| Performance | Coming soon. |

## Files

- `components/sheets/classroom-overview-sheet.tsx`: the shell.
- `components/classroom-overview/`: the rail and bar, the section header, metrics, and payments.
- `packages/ui/src/components/custom/sheet.tsx`: `secondaryLayout="replace"` and `secondaryBackLabel`.

## Validation (2026-10-12)

- **Tests**: 5 new rail and header tests (`classroom-section-nav.test.tsx`) plus the existing attendance list, roster and utility tests (15 pass).
- **Typecheck**: dashboard `tsc` reports no errors in the changed files. The existing unrelated errors are unchanged.
- **Lint**: not run. `next lint` was removed in this Next version, and the app has no ESLint binary.
- **Live browser QA**: done on the owner-started local stack (Daarul Hadith, Admin) at 1440 × 900 and 375 × 812.
  - Checked: the rail metrics from real data, each section page, and the class's RTL names.
  - Attendance: Take attendance, then Add student, then Back kept a local mark (nothing was saved).
  - Subject workspace: the Assessments and Score entry tabs.
  - Payments: the empty state.
  - Phone: the chip bar, the full-screen form with "← Students", and no horizontal overflow.
- **Fixed during QA**:
  - The Radix ScrollArea `display:table` wrapper stretched pages and detail panels to the widest table. It is now forced to `block`.
  - The students table scroll box is sized to the remaining height with `--header-offset`.
  - The subject row text lines now align together.
  - A nested button inside the assessment suggestions trigger.
  - Mixed-direction text in the subject header.
- **Gap fixes (same day)**:
  - Counts are consistent: the rail, Students header, attendance roster and subject workspace all show 52 for the test class (previously 57, 52 and 110). `subjects.overview` now counts distinct students with a term form in the subject's term.
  - Disabled finance is reported as such instead of "Nothing outstanding".
  - Class-local search, with no leak from the Students page's filters (verified: no `q` in the URL).
  - Stale subject params are cleared.
  - `FormInput` uses `px-1` instead of `mx-1`, so full-width fields no longer overflow by 8px. This affects every form.
  - The populated charges list is covered by fixture tests.
  - A stalled first load seen during QA was the hidden browser pane (requestAnimationFrame never fires), not the app; a visible tab loads the sheet directly.
- **Attendance taps**: no toast per tap, and tap again to clear in new sessions. Verified live.
- **Role review (code)**: the rail's queries have no role restriction beyond the module, and Payments shows "Unavailable" if charges are refused. Admin-only deletes and manager-only student actions use the existing role helpers.
- **Teacher (live, via QA login)**: the sheet loads with the same rail. The student row menu offers only View details; subjects have no delete; Attendance works. Registrar is not covered because the local data has no Registrar user.
- **Left as is**: the four stat cards in `SubjectAssessments`. They are shared with three other screens and already hidden on phones.
- **Workshop reference**: `artifacts/classroom-sheet-v2-workshop/02-rail/`.
