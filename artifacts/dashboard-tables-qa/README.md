# Shared dashboard tables QA — 2026-10-06

## Checks

- Classroom results: 43 rows at 1280×900, 390×844 and 320×844. No nested vertical
  scroller. Wrapper clientHeight and scrollHeight both 2536px. Scrolling over the
  table moved window scroll to 1698.5px on desktop and 980.5px at 320px while
  table scrollTop stayed 0. Checkbox centers within 0.004px. Single selection,
  header indeterminate, all 43 selected, deselection passed.
- Staff directory: 3 records, natural table height 252px at desktop. At 320px
  the existing mobile cards produce a 1873px document without nested scrolling.
- Classroom overview sheet: opened from report review, confirmed explicit
  container mode and 18 rendered virtual rows; closed successfully.
- Students: 390px, no nested scroller. Page scroll to 1688px grew table height
  from 3645 to 5445px with virtual rows still rendered. Selection offsets remain
  within 0.5px (one-pixel border).
- Finance fixture: real generic finance, streams and ledger components with
  40 synthetic rows each; legacy table with four. At 390px/1280px, every table
  wrapper has equal client/scroll height and no nested vertical scroll.
  Standalone and legacy selection controls are centered within 0.25px and
  legacy checkbox translate is reset. Generic select-all and deselection pass.
  `fixture.tsx` is archived evidence; its temporary application route was removed.
- Focused Biome unused-import lint passes on all 10 changed TSX files.
- `git diff --check` passes. Root typecheck exits 2 on existing site-nav/UI
  React/csstype errors. Dashboard typecheck exits 2 on existing API/generated
  and shared React errors. Shared skeleton/virtual-row style errors match
  `/tmp/sc-student-scroll-typecheck.log` and `/tmp/sc-summary-final-types.log`.

## Limits

Finance is disabled for this local school; the live account query, selection,
and cursor observer were source-audited rather than exercised. No school module
settings or database records were changed. Sheets and dialogs intentionally
keep bounded scroll areas. Report page horizontal overflow at 320px remains
outside this vertical-scroll/checkbox change (356px document); the table's
own horizontal overflow remains inside its wrapper. No score edits or print
actions were performed.

## Brain documentation impact check

Updated `.brain/features/dashboard-tables.md`, `.brain/features/student-directory.md`,
`.brain/features/assessment-results-and-sub-assessments.md`, `.brain/decisions/ADR-0072-student-directory-page-scroll.md`,
`.brain/decisions/ADR-0073-dashboard-table-page-scroll.md`, `.brain/tasks/done.md`,
and `.brain/BRAIN.md`. No API, schema or permission documentation changes needed.
