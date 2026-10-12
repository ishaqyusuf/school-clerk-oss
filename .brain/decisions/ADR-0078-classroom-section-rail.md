# ADR-0078: Classroom overview as a section rail with in-place details

- Date: 2026-10-12
- Status: Implemented locally. Component tests and local browser QA (desktop and phone) pass.
- Extends: ADR-0077 (attendance draft ownership)

## Context

The owner found the classroom overview sheet "a bit clumsy". It had a header with three stats, two of them always "--". The student count was shown three times. Each tab body looked different, the Attendance tab had tabs inside it, and one subject tab had no label. A workshop (`artifacts/classroom-sheet-v2-workshop`) compared three directions against a 42-item feature inventory. The owner accepted **02 Section rail**.

## Decision

- The sheet has two columns.
  - On desktop, a left rail holds the class switcher and term. Below them are the five sections, each with one live metric (computed by `useClassroomMetrics`). The rail replaces the header stats. Close sits at the bottom of the rail.
  - Below `lg`, the rail becomes a top bar: the class switcher, Close, and a scrollable row of section chips.
- Every section page uses `ClassroomSectionHeader`: a title, one line of context, and one primary action.
- Details replace the section page instead of widening the sheet. These are the new student form, the subject workspace, attendance session details, and attendance correction.
  - `packages/ui` `CustomSheet` gains an opt-in `secondaryLayout="replace"` mode. In this mode the sheet keeps its primary size, `PrimaryContent` steps aside while a secondary panel is open, and `MultiContent` lets the caller own the layout.
  - The optional `secondaryBackLabel` names the section on the back button.
  - Other sheets keep the default `"split"` behaviour.
- Attendance has no inner tabs inside the sheet. The page shows a Today card and the session history. The recorder is its own page, selected by the new URL param `attendanceView=take`.
  - The draft provider from ADR-0077 keeps marks while Add student is open.
  - The teacher workspace keeps the original tabbed layout through `layout="tabs"`.
- The rail and the open section use the same query inputs, so they share TanStack cache entries. No API or schema changes.

## Consequences

- The sheet keeps one width (`4xl`) at every breakpoint.
- Opening a detail unmounts the section page. Section state that is not in the URL or a provider resets on Back, for example the subject add-form draft.
- These are fixed along the way:
  - The new-student success-state Close now closes the panel (`StudentFormAction.onClose`).
  - The class count refreshes after a create from any section (`onCreated`).
  - A subject save error no longer throws.
  - The add-subject form resets after each save.
  - Subject and session delete are limited to Admin on this sheet.
  - The recorder's Add student is open to Registrars.
  - The classroom sheet no longer shares `sheetName` with the student overview sheet.
- Follow-up fixes on the same day:
  - The students table gained `filterMode="local"` for embeds.
  - Section counts are term-scoped.
  - The rail and page explain when Billing & Finance is off.
- These are still open:
  - The students table keeps its own container scroll, sized with `--header-offset`.
  - The subject workspace stat cards live in `SubjectAssessments`.
