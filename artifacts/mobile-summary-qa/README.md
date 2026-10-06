# Compact dashboard summaries — verification, 2026-10-06

## Implemented scope

39 explicit summary grids across 35 existing implementation files, plus the
shared responsive stylesheet and number adapter. Coverage includes home,
academic, student, staff/teacher, attendance/assessment, enrollment, inventory,
collections, current and legacy finance, website CMS, and matching skeletons.
The student toolbar now fills mobile width with search above a full-width action
row. No school records, module configuration, API behavior or database schema
changed. No commit, deploy or publication performed.

## Browser evidence

QA used the requested **Codex in-app browser** and the existing cmux stack at
`https://daarulhadith.school-clerk-dashboard.localhost` through the active shared
Portless proxy. Temporary viewport overrides were reset; the original dark
theme was restored and the browser returned to Students.

- Live home: 390px, 3 cards, two 183px columns, 8px gap, 12px padding,
  full-width final card, no overflowing summary content.
- Live academic overview: 390px, all three cards and edit controls visible,
  no summary content overflow. An existing page-header/history width problem
  remains outside the card grid.
- Live students: 320/390px, all four totals and all three duplicate-check
  metrics visible. Search fills the available width (374px at a 390px viewport).
  Search submission updates `?q=QA`; clearing and the filter menu work.
  Light and dark mobile screenshots and the 1280px desktop layout were checked.
- Live staff directory/profile: compact summary visibility checked on mobile;
  profile desktop retains two header cards and four overview columns at 1280px.
- Real finance/academic/number components were rendered in a temporary local
  fixture with zero, negative and billion-scale currency values, 3/4/5-card
  layouts and skeleton examples. 320px checks reported page width 320px and
  **zero overflowing summary descendants**. React hydration was confirmed after
  correcting the fixture-only build/SSR setup; no fresh fixture hydration error
  occurred on the final reload. Desktop animated values remained complete.
- Breakpoints 390/767 use two columns and 8px gaps; 768/1280 resume original
  desktop columns, gaps and padding. See `measurements.json`.

Temporary fixture HTML, JS and generator files were removed from the app after
QA. Screenshots remain as evidence, not deployable app routes.

## Checks and limits

- `git diff --check`: passed.
- TypeScript syntax/transpile check: 40 changed/new TSX files, zero errors.
- Actual dashboard CSS compiled successfully with the installed Tailwind/PostCSS
  pipeline for component fixtures.
- Focused Biome unused-import check passed for new number/student-toolbar files.
  Broader touched-file lint found existing unused-import warnings; no automatic
  unrelated cleanup was applied.
- `bun run typecheck`: fails in existing shared calendar React/CSS type
  incompatibilities in `@school-clerk/site-nav`.
- `bun run --cwd apps/dashboard typecheck`: existing API/generated-client/UI
  errors remain. The only diagnostic in a touched implementation from the
  initial and final runs was the pre-existing missing `AlertTriangle` import in the
  promotion page; summary changes do not reference that symbol.
- `bun run --cwd apps/dashboard lint`: fails because this project's script uses
  the removed `next lint` command (Next treats `lint` as a directory).
- Finance live pages correctly reject access because this local tenant has
  Billing and finance disabled. Financial presentation was checked with real
  component fixtures; no live finance workflow or permission change was made.
- Browser coverage is representative, not every legacy/deep-linked page. The
  source audit includes those implementations; dormant legacy components were
  not mounted or given new routes for this task.

## Screenshots

- `students-mobile-dark.png`: final mobile totals, search and actions.
- `students-mobile-light.png`: same surface with light tokens.
- `students-desktop-dark.png`: retained desktop cards and toolbar layout.
- `staff-mobile-dark.png`: newly visible staff metrics (320px).
- `fixture-320-dark.png` / `fixture-320-light.png`: full long-value and skeleton
  fixture at narrow width.
- `fixture-desktop-hydrated.png`: desktop real-component fixture.
