# Classroom overview sheet — feature inventory (must all be captured)

Source audit of `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx` and everything it opens
(2026-10-12). Every direction must place **every** item below somewhere reachable and working with sample data,
and list where it lives in its on-page "Coverage" panel using these IDs. Items marked *(fix)* are current
bugs/clumsiness the new design should resolve rather than copy.

## H — Sheet shell & header
- **H1** Classroom switcher (all current-session classrooms). Switching keeps the current section, clears open detail panels, attendance session and drafts.
- **H2** Session/term label (First Term · 2026/2027).
- **H3** Class name.
- **H4** Header stats: Students count, Attendance, Class average. *(fix: today Attendance/Class Avg show "--" and the student count is shown 3×; use real computed numbers once, or drop what has no data — Class average depends on Performance which is "coming soon".)*
- **H5** Sections: Students, Attendance, Subjects, Payments, Performance (coming soon). Deep-linkable (`classroomTab`). *(fix: null tab shows a blank body — always default to a section.)*
- **H6** Close sheet. Secondary/detail panel open & close (desktop: beside primary; phone: replaces primary).
- **H7** Loading skeleton and error fallback for the sheet.

## S — Students
- **S1** Duplicate check: loading line "Checking student count and duplicate names…"; totals (students, duplicate groups, affected students); amber alert listing each group (name, N records, recommended survivor + class) with **Review merge**; or a calm "No duplicate names found". *(fix: don't repeat the student count a third time.)*
- **S2** Review-merge dialog: members (name, "Recommended survivor" badge, history score, counts of assessments/attendance/charges/payments), "Records to move" preview (term forms, attendance, assessments, charges, payments), conflicts, **Cancel**, **Merge duplicate** (disabled unless canMerge). Merge removes the duplicate from the roster.
- **S3** **Add student** → New Student form (secondary).
- **S4** Student list with fields: avatar initials, name, Student ID (first 8 chars), gender, enrolment status (Enrolled / Not enrolled), admission status (New admission / Returning / Needs classification), date of birth, guardian, guardian phone. *(Class column is redundant inside a single class.)*
- **S5** Sort (name, gender, dob, created), search by name/ID. *(fix: search is commented out today and global student filters leak into this view.)* Column choice / reorder are nice-to-have.
- **S6** Row click → Student overview (header: name, class, gender, Report Card, Edit; tabs Overview [Student ID, current class, current term, gender, move-class select], Academics, Attendance, Payments).
- **S7** Row menu: Ask assistant, View details; Admin/Registrar only: Edit information, Remove from current term (only when enrolled in term), Delete student — each with confirm dialog, error and "Saving…" states.
- **S8** Multi-select + bulk bar: selected count, Deselect, Assistant, **Export CSV** (Student ID, Student, Class, Gender, Status, Guardian, Phone); Admin/Registrar only: **Set admission status** (New/Returning/Needs classification — also reconciles fees), **Move class** (destination select, refresh destinations, 1–100 limit), **Remove from term**. Confirm dialogs + success toast summary.
- **S9** Empty states: "No students" + Enroll student; "No results" + Clear filters; loading skeleton; "Loading more students…" (infinite list).
- **S10** New Student form: First name, Surname, Other name, Gender, Date of birth, Admission status for this term, Classroom (prefilled), Stream/Sub-class, Fees & payments (fee preview with per-fee add, Retry fee preview, Payment method, Payment date, Payment reference), collapsible Parent (Name, Phone, Phone 2). Success: "Student created", received/pending summary, **Create New**, **Close**, **View Receipt** or **Apply Payment**. "Loading your registration workspace…" state. *(fix: Close must actually close the panel; roster/count refresh after save from any section.)*

## A — Attendance
- **A1** Take attendance form: Attendance type (General class / Subject), Session title (default "Daily attendance"), Subject select (when Subject; auto-fills title), Period/time (optional).
- **A2** Date picker with previous/next day and calendar.
- **A3** Add student from the recorder (Admin/Registrar) → New Student form.
- **A4** Bulk: Mark all as ›, Mark rest as › (Present/Absent/Late), Clear all.
- **A5** Roster: No., Student, Present/Absent/Late toggle (tinted rows), Remarks input only for Absent/Late; tap a mark again to clear. Loading/error/"No students enrolled in this class for the active term" states; batched rendering for long rosters.
- **A6** Progress "X of Y students marked" with partial-save allowed; inline validation/submission errors; **Save attendance**. *(fix: no toast on every tap.)*
- **A7** Sessions history: totals — Total sessions (+records), Average attended % (+attended), Average absent % (+absent); **Export CSV**.
- **A8** Session list: title, date · subject · period, Taken by, Present (incl. late), Absent, Rate bar, **Open**, **Delete** (confirm). *(fix: gate delete to Admin.)* Empty state "No attendance records yet".
- **A9** Session details: title, date, staff, subject, period, "N% attended"; counts Students/Present/Late/Absent (+excused, on leave); Revision history (action, actor, time, summary); student list (status, remarks/"No remark"); **Close**, **Correct session**; not-found state.
- **A10** Correct session: same form prefilled; **Cancel**, **Save correction** (adds a "Corrected" history entry).
- *(fix: tabs-inside-a-tab feels clumsy.)*

## U — Subjects
- **U1** Add subject: inline form (Name, Description, Save) with error handling; resets after save. *(fix: today errors crash and the form doesn't reset.)*
- **U2** Import from catalog (only when unattached subjects exist): checkbox list, "N selected", Select all / Clear all, **Batch import**.
- **U3** Subject list: title, number of assessments, weight status. *(fix: drop static filler copy and the always-on "Active this term" badge.)* Open, Delete (confirm; gate to Admin). Empty state with a working create action.
- **U4** Subject workspace header: subject title, class, N students; stats Score items, Total submissions, Configured weight %, Grouped items. *(fix: stats are duplicated in two places; one unlabeled tab and one empty tab.)*
- **U5** Assessments: **Create**, quick-add suggestions (title, obtainable, %), result print preview ("Label (w%)" or "No print columns"), rows (title, #n, weight %, submissions, points or Uncapped, sub-assessment count, print status, 0% warning), reorder ↑/↓, Edit, Delete (confirm). Child rows ("Part n under X"). Empty "No assessment".
- **U6** Assessment form: Title; "Split into sub-assessments" switch → print mode Expanded/Total + child rows (Title, Obtainable, Weight %, add/remove) with totals; otherwise Obtainable (blank = uncapped) and Weight %; print status + warnings; Cancel/Save.
- **U7** Score entry grid: students numbered, one input per weighted assessment with "/ max" or "Uncapped", over-max shown in red, debounced autosave with saving/saved/error indicator. *(fix: hard-coded Arabic header; respect locale/RTL names via dir="auto".)*
- **U8** **Record submission** / open recorder with permission scope Full / Classroom / Subject (opens the separate assessment-recording page in a new tab — simulate).

## P — Payments
- **P1** Totals: Billed, Received, Outstanding, Collection % with "x/y paid".
- **P2** Charges list sorted by outstanding: student, status badge (paid / part paid / pending), fee title · stream, outstanding (or paid amount), "paid ₦x", **Record** (prefilled with student). "N outstanding, N settled". Empty "No student charges". Loading skeleton.
- **P3** **Receive payment** (generic) → opens the receive-payment sheet (simulate: amount, method, reference, Save; updates totals).
- *(fix: rows could open the student.)*

## R — Performance
- **R1** Performance — Coming soon placeholder (Class average lives here when available).

## X — Cross-cutting
- **X1** Role gating: Admin / Registrar / Teacher change what's offered (S7, S8, A3, A8 delete, U3 delete).
- **X2** Light + dark theme.
- **X3** Phone (≤ 430px) and desktop sheet widths; keyboard focus; `dir="auto"` on names.
