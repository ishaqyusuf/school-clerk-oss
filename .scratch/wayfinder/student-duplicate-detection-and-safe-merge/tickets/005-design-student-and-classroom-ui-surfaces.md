# Design Student And Classroom UI Surfaces

Labels: `wayfinder:prototype`
Status: Open
Blocked by: `000-verify-student-classroom-filter-contract.md`, `001-define-duplicate-identity.md`, `004-design-detection-and-merge-api-contract.md`
Blocks: `007-build-implementation-handoff.md`

## Question

How should duplicate warnings, student counts, and merge actions appear in student pages and classroom overview?

## Context

The user asked for duplicate warnings before listing students, a count for number of students available in the Students tab, and protection from accidental deletion of the copy that has previous records.

## Resolve

- Student list page:
  - total student count
  - filtered classroom count
  - duplicate alert before the table/grid
- Classroom overview:
  - Students tab count
  - duplicate alert before listing students
  - count should agree with fixed classroom filter behavior
- Student overview page/sheet:
  - local alert when opened student belongs to a duplicate group in the selected classroom/term
- Merge preview UI:
  - duplicate group
  - recommended survivor
  - history/current-term record counts
  - records that will move
  - conflicts
  - final confirmation
- Empty/no-duplicate state.
- Mobile behavior and role-based visibility.

## Expected Answer

A screen-level behavior spec and rough component placement, with enough detail for implementation without a separate design conversation.

## Approved Comment

On `/students/list`, show a compact count and duplicate alert above the table/grid whenever a classroom filter is active or duplicates exist in the active term. In classroom overview, the Students tab should show the student count in the tab/header area and render a duplicate warning before the student list. Student overview should show a local warning when the opened student belongs to a duplicate group. The merge UI should be a preview-first confirmation flow showing the duplicate group, recommended survivor, current-term owner, historical record counts, records to move, conflicts, and a clear final confirmation.
