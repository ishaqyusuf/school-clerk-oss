# Student scroll and checkbox verification — 2026-10-06

## Scope

Current `/students/list` page only: opt-in window virtualization and document
scrolling, shared infinite-scroll event target typing, and selection alignment.
Classroom embeds retain their default fixed-height container mode. Existing
toolbar/filter work from other active changes was preserved. No data mutation,
API, schema, permission, secret, commit or deployment change was made.

## Browser checks

Used the existing local stack in the requested Codex in-app browser at
`https://daarulhadith.school-clerk-dashboard.localhost/students/list`.

- 390px and 1280px: no nested vertical scrolling element; table clientHeight
  equals scrollHeight and its scrollTop remains 0.
- Scrolling over table rows advanced window scroll from 404 to 1257 and grew
  table height from 1885px to 3645px as more records loaded. Continued scrolling
  advanced the virtual range to 64–96 and grew the roster to 100 loaded records.
- Resize and scrolling retained visible virtual rows, with overscan rather than
  mounting the full loaded roster.
- 320px: no nested vertical scroller; header and row checkbox horizontal offsets
  are +0.5px, vertical offsets +0.5px / -0.5px relative to cell centres.
- Single-row selection set the header indeterminate, showed one selected row,
  and did not open a student sheet. Deselecting restored zero selections.
- Header select-all checked the loaded roster (75 rows at that checkpoint);
  clearing it removed selection. No bulk mutation was invoked.
- A non-matching search reached No results with no table, and Clear filters
  restored the directory at the canonical URL.
- Actual tenant table direction is RTL and was preserved.
- A pre-existing ~2px account-menu overflow at 320px remains outside this change;
  the table's horizontal overflow is contained.

Screenshots: `students-320.png`, `students-desktop.png`.

## Source and command checks

- Midday customer directory inspected. Its route/query/settings/DnD/sticky-column,
  selection and sheet architecture is retained. The owner-requested page scroll
  exception is recorded in ADR-0072.
- `bunx biome lint --only=correctness/noUnusedImports` on the five touched code
  files: passed.
- `bun run --cwd apps/dashboard typecheck`: existing API/generated-client and
  shared UI errors; no new diagnostics in the changed scroll or checkbox code.
  The header CSSProperties error existed in `/tmp/sc-summary-final-types.log`
  before this task (146:11, now shifted to 147:11).
- `bun run typecheck`: fails in existing shared calendar React/CSS incompatibilities.
- `bun run --cwd apps/dashboard lint`: fails because Next treats the unsupported
  `next lint` invocation as a request for the nonexistent `lint` directory.
- No new dependencies or tests mirroring implementation were added. Browser
  checks exercise the actual scrolling, cursor loading and selection behavior.

The workshop was saved for later; only its own preview server was stopped.
