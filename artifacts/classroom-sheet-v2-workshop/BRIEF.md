# Builder brief — Classroom overview sheet v2 workshop

The owner finds today's classroom overview sheet "a bit clumsy" and wants **three new, simple and clean
directions** that **capture all existing features**. This is a reviewable HTML prototype, not product code.

Product context: School Clerk is a multi-tenant school-operations dashboard (Nigeria-first, ₦). The classroom
overview sheet opens from the Classrooms table as a right-side sheet (shadcn Sheet, primary width 48rem; when a
detail panel opens on desktop the sheet widens to ~72rem and the detail panel sits beside the primary content;
on phones the detail panel replaces the primary content). Today it has: a header (classroom switcher, session
badge, class name, 3 stats with two showing "--"), an underline tab bar (Students / Attendance / Subjects /
Payments / Performance) and very different-looking tab bodies (a wide 11-column table, tabs inside the
Attendance tab, card grid for subjects, 4 stat cards for payments). Read `FEATURES.md` in full — it is the
contract. Items marked *(fix)* are clumsiness to resolve, not copy.

A previous workshop (`artifacts/classroom-overview-workshop`, "Quiet tabs / Focus view / Class home") exists.
Do not repeat those ideas; these are new directions.

## What "simple and clean" means here
- One clear hierarchy per screen: title → one line of context → one toolbar → content. No stacks of stat cards.
- Each number appears once. No placeholder "--". No static filler copy.
- One primary action per view, the rest in a ⋯ menu or row menu. Consistent toolbar placement across sections.
- Lists, not wide tables, by default in a 48rem sheet; secondary fields shown on a second line or on demand.
- Generous but not wasteful spacing, 14px body, 12–13px secondary, tabular numbers for money and counts.
- Same tokens as today's product (green/ivory, Instrument Sans) — `shared/tokens.css`. The comparison is about
  structure/hierarchy, not colour. You may define direction-local variables (`--x-…`) in your own CSS.

## Files
```
artifacts/classroom-sheet-v2-workshop/
  BRIEF.md  FEATURES.md                ← read both in full
  shared/tokens.css                    ← product tokens (light + .dark). DO NOT EDIT.
  shared/shadcn.css                    ← shadcn primitives in plain CSS (.btn .btn-default/-outline/-ghost/-secondary/-destructive .btn-sm .btn-icon,
                                          .badge .badge-success/-warning/-outline…, .input .select .textarea .field .label .checkbox .switch,
                                          .table, .tabs-list/.tabs-trigger, .popover .menu-item .menu-sep, .dialog, .overlay, .alert, .avatar,
                                          .skeleton, .progress, .breadcrumb, .toast). READ IT. DO NOT EDIT.
  shared/icons.js                      ← SCIcons.icon(name,size) → Lucide SVG string; <i data-icon="users" data-size="16"></i> + SCIcons.hydrate(el). SCIcons.names lists names.
  shared/data.js                       ← SC.fresh() deep-cloned sample data; SC.money, SC.esc, SC.initials, SC.fmtDate, SC.fmtDay. DO NOT EDIT.
  shared/frame.js + workshop.css       ← workshop chrome: top bar (viewport Desktop/Phone, "Viewing as" role, theme, Coverage, Reset), stage with faded dashboard. DO NOT EDIT.
  NN-name/index.html, NN-name/sheet.css, NN-name/sheet.js   ← YOUR files only
```
Head order:
```html
<link rel="stylesheet" href="../shared/tokens.css">
<link rel="stylesheet" href="../shared/shadcn.css">
<link rel="stylesheet" href="../shared/workshop.css">
<link rel="stylesheet" href="sheet.css">
<script src="../shared/icons.js"></script><script src="../shared/data.js"></script><script src="../shared/frame.js"></script>
<script src="sheet.js" defer></script>
```
Your `sheet.js` calls `SCW.init({ id, name, tagline, coverage, mount, reset, onRole? })` (see the header comment in
`shared/frame.js`). `mount(host, ctx)` renders the whole product sheet into `host` (an absolutely-positioned,
right-anchored box inside the stage; default width 48rem; set `host.style.width` yourself when a detail panel
widens the sheet, e.g. `min(100%, 72rem)`). `ctx.viewport` is "desktop" or "phone" (390px stage — the sheet fills
it and detail panels must replace the primary view). `ctx.role` is Admin/Registrar/Teacher, `ctx.canManage`
(Admin or Registrar), `ctx.isAdmin`. Use `ctx.toast(title, desc)` for confirmations (sparingly). Keep all state in
one object created from `SC.fresh()`; `reset()` must recreate it and clear timers. Re-render with your own
`render()` (innerHTML + event delegation is fine) — remember `SCIcons.hydrate(host)` or use `SCIcons.icon()`
strings directly.

**Dialogs/menus must stay inside the stage**: append overlays to `host` (or `#stage`) and override position to
`absolute` (e.g. `.x-overlay{position:absolute}` / `.dialog` inside host gets `position:absolute`), so they sit
inside the phone frame too. Close on Escape and on scrim click; return focus where sensible.

Plain HTML/CSS/JS only. No frameworks, no CDNs beyond the font import already in tokens.css, no network calls.
Escape all user-typed text with `SC.esc`. Use `dir="auto"` on names. Keyboard focus visible. Respect
`prefers-reduced-motion`. Must work in light and `.dark` (toggle on `<html>`).

## Must work with sample data (everything in FEATURES.md, minimum interactions)
- Switch classroom (incl. the empty "SS 1 · Science (empty)" class to show empty states) — keeps section.
- Students: search, sort, select rows → bulk bar → Export CSV (generate a real Blob download of sample CSV),
  Set admission status / Move class / Remove from term (confirm → mutate → toast summary); row menu actions with
  confirms; Review merge dialog → Merge removes duplicate; Add student form → Save adds to roster and shows the
  success state with Create New / Close / View Receipt or Apply Payment; Student overview with its 4 tabs.
- Attendance: take attendance for a date (type/title/subject/period, prev/next day), P/A/L toggles with tap-again
  to clear, remarks for Absent/Late, Mark all / Mark rest / Clear all, "X of Y marked", Save → session appears in
  history; history totals; Open session details with revision history; Correct session → save adds history;
  Delete (Admin only) with confirm; Export CSV.
- Subjects: add subject (validation error when name empty), import from catalog (multi-select), delete (Admin),
  open workspace → assessments list with create/edit (incl. split into sub-assessments with print mode)/reorder/
  delete/quick-add suggestions, print preview, score entry grid with autosave indicator (fake 600ms) and red
  over-max, Record submission scope menu (simulate: toast "Opens assessment recording (Classroom scope) in a new tab").
- Payments: totals, sorted charges, Record (prefilled student) and Receive payment (generic: pick student) →
  simulated payment form → updates totals/status.
- Performance: coming soon.
- Role switch visibly gates actions (Teacher sees no Edit/Remove/Delete/bulk manage/delete session/delete subject).
- Phone viewport is a first-class layout, not an afterthought.

## Coverage panel
Pass `coverage` = an object with EVERY ID from FEATURES.md (H1…X3) → one short phrase of where/how it lives in
your direction. Missing IDs = incomplete.

## Done means
- `node --check NN-name/sheet.js` passes.
- Open the page (file:// path works in a browser; or the orchestrator will serve the folder) — no console errors.
- Report back: a 3–5 line summary of the direction, any FEATURES.md items you could only partially simulate,
  and anything you'd flag. Do not edit files outside your own `NN-name/` folder.
