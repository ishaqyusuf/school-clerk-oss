# Wayfinder Map: Student Import Flat Sectioned Redesign

## Destination

An implementation-ready plan for replacing the current student import setup/review experience with a minimal two-stage workflow: a quiet paste-first setup screen with a compact horizontal defaults form and status footer, followed by one scrollable sectioned table review where checked executable rows can be imported only after all selected blockers are resolved.

## Notes

- Local-only effort: do not create GitHub issues or PRs.
- Scratch artifacts for this effort live under `.scratch/wayfinder/student-import-flat-sectioned-redesign/`, not under `.brain/`.
- Planning mode: resolve the UI/interaction decisions before implementation. Do not implement code while charting this map.
- User direction captured on 2026-07-14:
  - First screen should contain only the compact defaults form, pasted text input, status footer, and proceed button.
  - Defaults form should be flat and horizontal, including import mode, classroom/fallback classroom, global gender, and current required setup controls.
  - Footer status should show parsed line count, lines needing fixes, and a simple colored state.
  - Proceed loads a table-like review UI.
  - Review should be one scrollable surface, not tabs.
  - Review rows should be grouped into visible sections such as needs attention, match found, and ready/new rows.
  - Rows are checked by default; footer/import counts and button state are based on checked rows.
  - Start import stays disabled while any checked row still needs fixing.
  - Row table columns should be: checkbox, student name with subtitle/status details, selected/closest match, selected action, and more actions.
  - Student name should show first name, surname, and other name as tiny editable badges/chips, with name-structure editing also available from the actions menu.
  - Match column should show the closest match plus confidence and `+N more` when additional matches exist; clicking it opens a popover to inspect/select candidates.
  - Action selection should expose the row's current action (`Import new`, `Keep match`, `Update match with name`, etc.) as its own dropdown.
  - More actions should contain secondary commands including name structure editing and any less-common row tools.
- Primary Brain context:
  - `.brain/features/student-import.md`
  - `.brain/decisions/ADR-0007-durable-student-import-background-jobs.md`
  - `.brain/api/contracts.md`
  - `.brain/api/permissions.md`
  - `.brain/engineering/ai-rules.md`
  - `.brain/engineering/coding-standards.md`
- Primary code surfaces to inspect during tickets:
  - `apps/dashboard/src/components/modals/student-import/index.tsx`
  - `apps/dashboard/src/components/modals/student-import/import-activities.tsx`
  - `apps/dashboard/src/components/modals/student-import/parser.ts`
  - `apps/dashboard/src/components/modals/student-import/import-errors.ts`
  - `apps/api/src/db/queries/students.ts`
  - `apps/api/src/trpc/routers/students.routes.ts`
  - `tests/student-import-parser.test.ts`
  - `apps/dashboard/src/components/modals/student-import/*.test.ts`
- Current observations:
  - The current setup screen already has a workflow shell, a large paste textarea, sidebar summary cards, warning callouts, and a footer.
  - The current review screen uses a command center, tabs, and compact row cards.
  - Existing row state already supports checked rows, manual gender, manual classroom, name structure overrides, manual candidate selection, search-promoted matches, row actions, single-row import, and background batch import jobs.
  - The new design is primarily a UI composition and state-gating redesign; current parser, verification, execution, and async job contracts should remain unchanged unless a ticket proves otherwise.

## Decisions So Far

- Scratch location: this effort uses `.scratch/wayfinder/student-import-flat-sectioned-redesign/` with `map.md` and `tickets/*.md`.
- Scope boundary: redesign the dashboard import UI composition and interaction model while preserving existing parser, verification, row-decision, and import execution semantics.
- Product direction: replace review tabs and row cards with one scrollable sectioned table; keep row actions available but make the main scan path much simpler.

## Tickets

- [001 - Define Minimal Setup Screen Contract](tickets/001-define-minimal-setup-screen-contract.md)
- [002 - Design Sectioned Review Table Model](tickets/002-design-sectioned-review-table-model.md)
- [003 - Define Row Interaction Patterns](tickets/003-define-row-interaction-patterns.md)
- [004 - Define Footer Counts And Import Gating](tickets/004-define-footer-counts-and-import-gating.md)
- [005 - Create Implementation Handoff](tickets/005-create-implementation-handoff.md)
- [006 - QA, Accessibility, And Brain Documentation Pass](tickets/006-qa-accessibility-and-brain-documentation-pass.md)

## Not Yet Specified

- Whether the review screen should keep single-row import actions visible or move them fully into the secondary action menu depends on row interaction design.
- Whether match candidate details should use a Popover, HoverCard, Sheet, or inline expandable row depends on accessibility and mobile behavior decisions.
- Whether the review table should be built with semantic table markup or a CSS grid/table hybrid depends on sticky headers, mobile layout, and existing component constraints.
- Whether the setup footer should count all raw non-empty lines or only parsed student rows depends on the setup contract ticket.

## Out Of Scope

- Changing student import parser semantics, classroom-header parsing, gender inference, or fuzzy matching rules.
- Changing `verifyStudentImport`, `executeStudentImport`, `startStudentImportJob`, or `getStudentImportJob` API contracts unless a later implementation ticket discovers a hard blocker.
- Rebuilding durable background job processing.
- Adding new database tables or migrations.
- Reworking the broader student list page outside the import modal opened from `/students/list?action=student-import`.
