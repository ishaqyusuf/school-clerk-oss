# Builder brief — School Clerk design-system workshop (shared by all three directions)

The user wants a **unique, high-quality design system on standard shadcn/ui** for School Clerk
(multi-tenant school operations SaaS, Nigeria-first, ₦). Today's dashboard is adapted from the
Midday project (monochrome, icon-rail sidebar that expands on hover, small grey text, square
badges). **Nothing may look like Midday.** Today's marketing (dark evergreen hero, Fraunces serif,
Veracross-like) is liked but we want something better.

Three directions, each a complete system across five surfaces:
`marketing.html`, `signup.html` (signup + full onboarding), `dashboard.html` (live shell + tables +
side sheet + modal), `components.html` (the style guide reference), `website.html` (website-generator editor).
The sample content is identical across directions (from `shared/data.js`) so the comparison is about design.

---

## Files and rules

```
artifacts/design-system-workshop/
  BRIEF.md                ← this file (read in full)
  shared/shadcn.css       ← shadcn primitives in plain CSS (btn, badge, input, field, card, table, tabs, sheet, dialog, popover/menu, toast…). READ IT.
  shared/data.js          ← window.SC.data (school, session, user, students, payments, fees, nav, website…), SC.money, SC.compact, SC.esc, SC.initials, SC.slugify, SC.checkSubdomain
  shared/icons.js         ← window.SCIcons.icon(name, size) → inline Lucide SVG string; <i data-icon="users" data-size="16"></i> auto-hydrates on DOMContentLoaded; call SCIcons.hydrate(el) after injecting HTML. SCIcons.names lists the ~200 available names.
  shared/workshop.js      ← SC.pill({id, name}), SC.theme.toggle(), SC.open(panelOrSelector, {onClose}), SC.close(panel), SC.toast(title, desc, icon), SC.reduced(), SC.store(k[,v]); [data-close] closes the nearest .sheet/.dialog; <button data-menu="#id"> toggles <div id class="popover" hidden>.
  shared/workshop.css     ← workshop pill styles (not product)
  shared/brand-mark.svg, brand-mark-inverse.svg  ← the canonical School Clerk mark (navy tile; inverse = light tile for dark surfaces)
  NN-name/tokens.css      ← the direction's tokens (shadcn variable names + extras). READ IT. DO NOT EDIT.
```

- **Do not edit anything in `shared/` or any `tokens.css`.** Other builders use them at the same time.
  Need another token? Define it in your own CSS as `--x-something` derived from existing tokens.
- Plain HTML/CSS/JS only. No frameworks, no CDNs except the Google Fonts `@import` already in tokens.css,
  no network calls, no new dependencies. Put JS in a separate file next to the page (e.g. `dashboard.js`)
  so it can be syntax-checked with `node --check`.
- Head order on every page:
  ```html
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="../shared/shadcn.css">
  <link rel="stylesheet" href="../shared/workshop.css">
  <link rel="stylesheet" href="YOUR.css">
  <script src="../shared/data.js"></script>
  <script src="../shared/icons.js"></script>
  <script src="../shared/workshop.js"></script>
  <script src="YOUR.js" defer></script>
  ```
  and call `SC.pill({ id: "01", name: "Registry" })` (your direction's id/name) once on load. The pill links
  all five surfaces and the hub; it is the only workshop chrome inside a page.
- Use the shadcn primitives' class names (`btn btn-default btn-sm`, `badge badge-success badge-dot`,
  `input`, `field`, `label`, `field-description`, `field-error`, `card`, `table`, `tabs-list`/`tabs-trigger`,
  `sheet`/`sheet-header`/`sheet-body`/`sheet-footer`, `dialog`/`dialog-header`/`dialog-footer`, `popover`/`menu-item`,
  `kbd`, `avatar`, `switch`, `checkbox`, `radio`, `progress`, `alert`, `toast`). Restyle them in your CSS
  **through tokens and modest overrides** to express the direction — the point is that this is shadcn, themed and
  composed with intent. Your direction.css may add composition classes (shell, page header, stat strip, bulk bar…).
- Sheets/dialogs: markup them `hidden` with `class="sheet"` / `class="dialog"` and open with `SC.open(el)`.
  Give each an `aria-labelledby` title. Use `--sheet-w` / `--dialog-w` to size.
- Every interaction is a local simulation. Keep a small, quiet "Preview · nothing is sent" note where a form
  would submit, outside the product UI where possible. Never call real services.
- Escape any user-typed text with `SC.esc` before inserting as HTML.

## Product truth (use it; do not invent features)

**Brand.** Wordmark "SchoolClerk" in marketing copy; accessible name of the mark "School Clerk". The mark is the
navy rounded tile with three squares, a white path and an amber endpoint dot — use the SVGs, don't redraw it.
Tenant model: each school gets `{subdomain}.school-clerk.com` (public website) and
`dashboard.{subdomain}.school-clerk.com` (workspace). Sample school: **Kingsway Academy, Ibadan** (`kingsway`).
Session **2026/2027 · First Term**, week 4 of 13. Signed-in user **Aisha Bello, Administrator**.

**Marketing integrity.** No customer logos, testimonials, user counts, ratings, uptime or security
certifications, or invented performance numbers. Allowed facts: 8 institution models, 20+ operational modules,
1 connected system; pricing ranges in `SC.data.plans`. Product previews are illustrative interface examples.
Copy: plain, warm, specific, British spelling (programme, enrol, colour), no hype words
("revolutionary", "seamless", "unlock", "empower", "AI-powered" as headline).

**Signup (today: one long page; redesign it).** Fields:
1. Institution name (required, ≥2) — e.g. "Kingsway Academy"; on blur/continue suggest subdomain via `SC.slugify`.
2. Institution type — tiles from `SC.data.institutionTypes`; only **K-12 School** is enabled ("Ready"); the others stay visible but disabled with their badge ("Coming soon" / "Contact us").
3. School subdomain (required, 2–63, letters/numbers/hyphens) with `.school-clerk.com` suffix; debounced (~350ms) **simulated** check via `SC.checkSubdomain(v)` → states idle / checking (spinner) / ok / error, messages exactly as returned. Show both derived addresses (site + dashboard) as they type.
4. Admin account — Full name (required), Work email (required, email), Phone (optional, "+234…"), Password (8–128, show/hide).
5. Context (all optional, skippable) — Country (Nigeria), Student count estimate, Education system (National / British / American / International / Hybrid), Language of instruction (English / Arabic / French / Mixed), Curriculum notes.
6. Create workspace → honest completion state. The product reports delivery cautiously: "School addresses reserved", "Verification email — accepted by email provider; inbox delivery is not confirmed.", "Workspace email", "Welcome notification". CTA "Continue setup". Include a clearly simulated "I've verified my email (preview)" affordance.

**Onboarding (inside the workspace; today only a "Onboarding step N of 5" pill — design a real progress system).**
1. **Welcome** — "Your workspace is live", workspace URL, what's next (session, terms, classrooms, staff invites). Primary "Set up academic session"; secondary "Verify email or request a fresh link".
2. **Academic session** — Session title (2026/2027), start date, end date, switch "Initialize with terms", terms table First / Second / Third Term with start/end dates, "Add term". First term start = session start. "Next".
3. **Classrooms** — Class name with suggestion chips (`SC.data.classSuggestions`), class level (numbered), "Sub-class" switch → streams (A/B/C or Emerald/Gold/Silver), class subjects (chips), optional "Set fees for this class". "Save classroom" adds to a saved list; "Next" always enabled.
4. **General fees** (all classes this term) — rows of Fee title, Type (Required/Optional), Amount (₦, thousands separators); starts with PTA Levy; suggestions PTA Levy, Exam Fee, ID Card, Portal Fee; "Add fee"; "Skip for now" / "Save and continue".
5. **Invite staff** — Staff email, Role (`SC.data.staffRoles`), for Teacher: class & subject access; "Send invite" → success state; "Skip for now"; "Go to dashboard" → `dashboard.html`.

**Dashboard navigation** — `SC.data.nav`: modules Overview, People, Academics, Finance, Operations, Settings, each with titled sections and items (use the exact labels). Header today has: page title, "Find anything…" search (⌘K / Ctrl K opens a search dialog), Term switcher ("2026/2027 · First Term", terms grouped by session), Assistant button, Notifications bell, theme switch, user menu (name, email, role, Log out). No school switcher (tenant comes from the domain).

**Students table** (People › Students): page actions Import, Approvals (3), New student. Stat cards: Total students 486, Enrolled this term, New admissions, Returning. Filters: class, status, admission type (+ search "Search students…"). Columns: select, Student (avatar + name), Student ID (`KWA/2026/0142`), Class (`JSS 2 A`), Gender, Status (Enrolled / Not enrolled), Admission (New admission / Returning / Needs classification), Guardian, Guardian phone, actions. Row menu: View details, Edit information, Remove from current term, Delete student (confirm dialog). Bulk actions: Export CSV, Set admission status, Move class, Remove from term.

**Finance** — Collections page (Finance › Collections) lists receipts from `SC.data.payments` (Receipt, Date, Student + class, Payer, Method, Amount, Allocation, Status Paid/Refunded) with term collection position from `SC.data.finance` (₦71.32m collected of ₦98.45m billed, 72.4%). "Receive payment" opens the receive-payment sheet: Student (search/select), Paying for (term select, "Current" badge), fee lines with amount due, Amount paying, Payment method (Transfer/Cash/POS), Payment date, Reference ("TRX-00123"), Note → "Confirm payment" → toast + new row.

**Create student sheet** (product fields): First name, Surname, Other name, Gender, Date of birth; Admission status for this term (New admission / Returning); Classroom + Stream; Fees & payments (checklist of applicable fees from `SC.data.fees` with amounts; Payment method, Payment date, Payment reference; totals Assigned / Paying now / Pending); Parent (collapsible): Name, Phone, Phone 2. Footer: Cancel / Save student. Validate required fields inline; on save, toast and prepend the row.

**Website generator** (Settings › Website; takes over the full screen). Templates (`SC.data.website.templates`): Scholaris (academic), Northfield (warm & family), Crestview (premium, PRO+ only), Kaleidoscope (colourful). Pages: Home, About, Admissions, Blog, Events, Resources, Contact. Home sections: Hero (kicker, title, body, CTA), Feature cards, Stats, Staff spotlight, Admission links, Announcements (+ About: School story; Admissions: process; Contact). Sections have visibility switches; Required sections are locked on; move up/down, duplicate. Theme options: style preset, base colour, primary/secondary/accent colours, radius, density, heading font, menu style. SEO fields. CMS collections with counts (Announcements 6, Blog posts 4, Events 3, Resources 9). Drafts are isolated from the live site; published configs are immutable ("Duplicate to edit"); one config live at a time. Live preview blocks accidental navigation. **The school website preview uses the tenant's own theme (from the editor), never the platform direction's palette** (ADR-0020). Only the editor chrome follows your direction.

## Surface requirements

### marketing.html
Header (Platform, Workflows, Roles, Pricing, FAQ; Sign in; primary "Create your school" → `signup.html`; secondary "Book a demo"); sticky; mobile menu sheet with big CTA.
Hero with ONE product promise, two CTAs, three assurances ("Guided onboarding · Flexible school setup · Role-aware access"), and an **original, animated product moment** specific to your direction (pause/replay control required; reduced motion shows the final state).
Institution-fit strip (`institutionFit`) — no logos. Connected workflows (`workflows`, 3) with a direction-specific visual. Modules overview (`modules`). Role tabs (`roles`; accessible tablist with arrow keys). **School website moment** ("Every school gets its own website at kingsway.school-clerk.com" — show a believable tenant site preview). Migration/rollout commitments (3: migration plan, tenant- and role-aware access, rollout support). Pricing (`plans`). FAQ (`faqs`, native `<details>`). Final CTA band. Footer (Product, Company: Contact, Support; Legal: Terms, Privacy). `#` hrefs.

### signup.html
One local interactive flow: signup steps → creation → onboarding 1–5 → "Open dashboard" (`dashboard.html`).
A live preview of *their* school fills in as they type. Large inputs (≥44px; 48px on touch), inline validation on
blur/continue, Back/Continue, typed data is never lost when going back, Enter advances, focus moves to the step
heading on step change. Mobile: single column, compact progress at top, **sticky bottom action bar**. Add a quiet
"Preview · nothing is sent" + "Restart" outside the product UI. Signup is a public page; onboarding must visibly
happen *inside the workspace* (use your direction's shell language), not look like more signup.

### dashboard.html
Full-viewport app shell with your direction's silhouette (see spec). Pages switchable from the nav without reload:
- **Students** (default) — full page as specified above, interactive (search filters rows live, filter chips, select all/some → bulk bar, row menu, Delete → destructive confirm dialog, row click → student detail sheet with tabs Overview / Academics / Attendance / Payments using sample data).
- **Collections** (Finance) — collection position + receipts table + "Receive payment" sheet.
- **Dashboard** (Overview) — greeting, term progress, 4 KPIs (students, attendance today 92.8%, collected this term, outstanding), "Needs attention" (`tasks`), quick actions. Keep it light; it shows the card language.
- Other nav items show a tasteful "Not part of this preview" empty state using your empty-state pattern.
Search ⌘K dialog (command list with sample students, receipts, pages; arrow keys + Enter). Term switcher popover. User menu with theme toggle (call `SC.theme.toggle()`). Notifications popover (3 items).
Responsive: ≥1280 full; 768–1279 condensed; <768 mobile nav pattern (drawer or bottom bar per spec), tables become
cards or scroll with a sticky first column (per spec), sheets go full-screen.

### components.html — the style guide
A reference page someone would implement from. Must include, rendered live from the tokens:
1. Header: direction name, one-paragraph intent, the shadcn config (style, baseColor, radius, fonts, sidebar variant/collapsible, icon library lucide) and a copyable CSS-variables block for `:root` and `.dark` (read from tokens.css text — you may inline it).
2. Colour tokens as swatches (light and dark side by side — render a `.dark` scoped panel), semantic status colours.
3. Typography scale (display, h1–h4, body, small, caption/eyebrow, numerals/tnum, mono).
4. Spacing, radius, density (control heights, row height), elevation/shadow rules.
5. Buttons (variants × sizes × states incl. loading, icon-only).
6. Form anatomy: Field (label, optional marker, description, error), input group (₦ prefix, `.school-clerk.com` suffix, search with kbd), select, textarea, date, checkbox, radio cards, switch, segmented control; horizontal vs vertical layout rule.
7. Status badge mapping table: every product status → badge variant (Enrolled, Not enrolled, New admission, Returning, Needs classification, Paid, Partially paid, Pending, Draft, Cancelled, Waived, Refunded, Invited).
8. Table anatomy: header, row states (hover, selected, keyboard focus), numeric alignment, empty, loading skeleton, bulk bar.
9. Sheet anatomy + sizes (sm/md/lg/xl widths), Dialog anatomy (confirm, destructive, form), when to use page vs sheet vs dialog (a 3-row decision table). Live "Open sheet" / "Open dialog" buttons.
10. Page header pattern, empty state, toast, KPI/stat card.
11. Do / Don't (6 rules max) that keep it from drifting back to Midday.

### website.html
The full-screen website-generator editor in your direction. Required: top bar (Back to dashboard, site name, status
"Draft · edited 4 min ago" vs "Live since 12 Sep 2026", page switcher, device toggle desktop/tablet/mobile, undo/redo,
Preview, **Publish**, ⋯ menu: Duplicate to edit, Archive draft, Media, CMS); a **template picker** state (4 templates,
Crestview locked "PRO+", Preview / Create draft) reachable via "Change template"; the **editor** state: section list
(visibility switches, Required lock, reorder, duplicate), selected-section inspector (Hero fields live-update the
preview), **Style** panel (preset, base colour, primary colour swatches + hex input, radius, density, heading font,
menu style — live-update the preview's own CSS variables), **SEO** panel (title, description with character count,
search-result snippet preview), CMS counts. Canvas: a believable rendered Kingsway Academy home page (nav, hero with
admissions CTA, feature cards, stats, announcements, admissions band, footer) in a browser frame showing
`kingsway.school-clerk.com`, resizing per device. Clicking a section on the canvas selects it (outline + label).
Publish → confirm dialog ("The live site will be replaced. Published versions can't be edited — duplicate to make
changes.") → simulated progress → toast; status flips to Live. Template preview images: build them in HTML/CSS
(mini renderings), no stock photos; for hero imagery use tasteful CSS/SVG compositions or solid colour blocks with
an "Image" placeholder treatment — never fake photography.

## Quality bar (all pages)

- No horizontal page scroll at 360px. Check mentally at 390, 768, 1280, 1440. Tap targets ≥ 40px on touch.
- Light **and** dark must both look intentional — use tokens; no stray hex in components except inside your CSS
  where a token can't express it (keep those rare and theme-paired).
- `prefers-reduced-motion`: no loops/parallax; show final states. Animate transform/opacity only.
- Semantics: landmarks, one h1, labelled inputs, visible focus, correct roles for tabs/menus/dialogs, Esc closes.
- Numbers: tabular numerals; money via `SC.money` (₦ with thousands separators).
- Make it feel designed, not templated: no generic gradient blobs, no emoji, no "glassmorphism" by default,
  no centred-everything layouts, no three-identical-cards-with-icons rows unless the direction calls for it.
- Before finishing: `node --check` every JS file you wrote; re-read your HTML for unclosed tags and ids your JS uses.
  **Do not open a browser or start/stop any server** (the orchestrator previews everything afterwards).

## Report back (under 200 words)
Files written; what makes your surfaces distinct within the direction; what you verified and how; anything unsure.

---

# Direction specs

## 01 — Registry  (`01-registry/`, pill: `{id:"01", name:"Registry"}`)
**Idea:** the school's register, beautifully kept. Established, calm, editorial authority — the evolved Academic
Evergreen. Ivory paper, evergreen ink, seal gold. Fraunces display (with italic emphasis), Instrument Sans UI.
**Signature moves:** hairline ruled lines instead of boxes; small-caps eyebrows (11–12px, uppercase, letter-spacing
.08em, muted); numbered sections ("01 — Admissions"); gold only as small marks (active rule, seal, progress, focus
accents), never body text on ivory (use `--highlight-ink`); almost no shadows; tabular numerals; page titles in
Fraunces.
- **Marketing:** ivory hero (flip today's dark hero), left-aligned Fraunces headline with an italic phrase; the product
  moment is a **living register page**: a student's record line that fills in — admission entry → attendance ticks across
  the week → fee receipt line → term report with a gold seal stamping — looped with pause. Workflows as a dark evergreen
  band with three numbered chapters; modules as a two-column ruled index (like a prospectus contents page); roles as an
  index tablist; website moment as a printed prospectus that becomes the site; pricing as a "fee schedule" ruled table;
  FAQ as a ruled list.
- **Signup:** two panes — left ivory form; right dark evergreen "charter" panel where the school's charter card builds
  live (monogram crest from initials, name in Fraunces, type, both addresses in mono); on creation a gold seal stamps it.
  **Onboarding:** an inset-shell frame (dark evergreen edge, ivory panel) with a left vertical "setup register" — five
  ruled lines with numerals, ticks and the current line marked with a gold rule; right the step form; under it a ledger
  card of what has been created so far (session, terms, classes, fees, invites).
- **Dashboard shell:** shadcn `Sidebar variant="inset" collapsible="icon"`: viewport background = `--sidebar` (dark
  evergreen); sidebar 256px (collapses to 56px icon rail via a toggle, ⌘B); top: mark + "Kingsway Academy" + site
  address; **all modules visible as grouped sections** (no module switcher), group labels small-caps `--sidebar-muted`,
  active item = sidebar-accent bg + 2px gold left rule, counts right-aligned; bottom: term card ("2026/2027 · First
  Term · Week 4 of 13" + thin gold progress) and user. Content = ivory inset panel (radius 14px, 8px margin, subtle
  1px border) with its own header: breadcrumb, search field ("Search students, receipts, staff…" + ⌘K), Assistant, bell.
  Mobile: sidebar becomes a left drawer; header gets a menu button.
- **Tables (ledger):** no vertical lines; header in small caps muted 11.5px with a 1px rule above and below; rows 48px;
  status as coloured dot + label text (not filled pills); IDs in mono muted; amounts right-aligned tnum; hover = faint
  `--highlight-soft` wash; selected = `--accent`. Quick filters as underlined text tabs with counts ("All 486 · Enrolled
  451 · Not enrolled 35"). Bulk bar = dark evergreen floating bar bottom-centre with gold count. Mobile: rows become
  ruled cards.
- **Sheet:** right sheet ~36rem on ivory; header with Fraunces 22px title + description; body sections separated by
  ruled small-caps headings with numerals ("1 · Student", "2 · Class & admission", "3 · Fees & payments", "4 · Parent");
  sticky footer with the running total on the left ("Assigned ₦212,500 · Paying now ₦0") and actions right.
- **Dialog:** 28rem, Fraunces title; destructive confirm requires typing the student's name.
- **Website builder:** "editorial workbench": left 280px outline (pages → sections as an indented, numbered, ruled
  contents list with visibility toggles), centre canvas on a muted "desk", right 320px inspector with tabs Content /
  Style / SEO. Ivory top bar, Fraunces site name.

## 02 — Timetable  (`02-timetable/`, pill: `{id:"02", name:"Timetable"}`)
**Idea:** built like a timetable — everything in its period. Precise, fast, keyboard-first operations for the bursar
and registrar who live in the app all day. Cool white, near-navy ink, cobalt primary, **highlighter yellow** signal.
Schibsted Grotesk + IBM Plex Mono.
**Signature moves:** visible grid lines; mono for eyebrows (uppercase 11px), IDs, amounts, dates, keyboard hints;
6px radius; compact density (32px controls, 38px rows); no shadows except overlays; yellow only for the keyboard cursor
row, "now" markers, search hits and one hero accent — always with dark text; `kbd` hints everywhere.
- **Marketing:** white with a faint grid-paper background; bold grotesk headline left with a yellow highlighter stroke
  behind one phrase; product moment right: a **live week timetable** (Mon–Fri × periods) where operational blocks land
  in their slots (07:45 Attendance JSS 2 A ✓ · 10:00 Receipt ₦92,500 · 13:00 CA scores recorded · 15:00 Report cards
  ready) with a moving "now" line; pause. Modules as a dense numbered grid (M01…M08, mono); workflows as horizontal
  lanes with connectors; roles as a split view; pricing as a crisp 3-column table; FAQ as a two-column index.
- **Signup:** centred 560px column with a horizontal period stepper (01 School — 02 Admin — 03 Context — 04 Create);
  on ≥1100px a sticky mono **provisioning manifest** on the right (name, type, subdomain → both addresses, admin email)
  that becomes a deploy-style log on creation ("Reserving kingsway.school-clerk.com … ok"). **Onboarding:** inside the
  two-tier shell look (dark top bar) with a left checklist rail (mono numbers, status), the form centre; terms editor
  as a timeline strip across Sep–Jul; classrooms as a class × arm matrix; fees as an editable spreadsheet grid with a
  totals row.
- **Dashboard shell:** two-tier. Dark top bar (`--topbar`, 44px): mark + school name, **module tabs** (Overview,
  People, Academics, Finance, Operations, Settings; active = yellow underline), right: search field with ⌘K, mono term
  chip "26/27 · T1 · W4" (opens term switcher), Assistant, bell, avatar. Below: white module sub-nav 224px (sections +
  items of the active module, mono counts, collapsible with ⌘B) and the content area on `--background`. Mobile: top
  bar keeps mark + module select; sub-nav becomes a horizontal scroll of chips under it.
- **Tables (spreadsheet):** full grid lines (`--grid-line`), mono uppercase header 11px, sticky header and sticky first
  column (checkbox + student), 38px rows, IDs and amounts in Plex Mono, status as square tags with a 2px left colour
  bar; **keyboard navigation** (↑/↓ moves a yellow cursor row, x toggles select, Enter opens detail) with a hint footer;
  "Group by arm" toggle (group header rows with counts). Filters as query chips (`class:JSS 2` `status:enrolled` ×) +
  "Add filter" + mono result count. Bulk bar **replaces the toolbar inline** (yellow bar "3 selected" + actions), not
  floating. Mobile: horizontal scroll with sticky first column.
- **Sheet:** "inspector" ~30rem; horizontal Field layout (9rem label column) for density; mono uppercase section
  headings; footer with kbd hints ("⌘↵ Save · Esc Cancel"); ⌘↵ actually saves.
- **Dialog:** ⌘K is a command palette; confirms are compact 26rem with a mono details table.
- **Website builder:** three-column IDE: left page tree + section stack with drag handles and mono section keys
  (`hero`, `features`, `stats`…), centre canvas on grey with device width shown in mono ("1280 px"), right properties
  panel with grouped fields and a colour-token table (name, swatch, hex). Dark top bar like the dashboard with mono draft
  status and "Publish ⌘⇧P".

## 03 — Assembly  (`03-assembly/`, pill: `{id:"03", name:"Assembly"}`)
**Idea:** a friendly school morning — warm, encouraging, approachable for non-technical staff and parents. Built from
the brand mark's own colours (navy, sky, teal, amber). Bricolage Grotesque headlines, Onest UI.
**Signature moves:** module identity tiles (rounded-square icon tiles: Overview navy, People sky, Academics violet,
Finance teal, Operations amber, Settings slate — use `--tile-*` tokens); generous radius (16px cards, 12px controls,
pill-shaped buttons); soft shadows (`--shadow-soft`) instead of borders on cards; amber dot motif (from the mark's
endpoint) for "you are here", unread and progress; friendly microcopy ("Good morning, Aisha"); progress rings.
- **Marketing:** airy light hero with a centred Bricolage headline; below it a **collage of floating product cards**
  (attendance ring 92.8%, fee receipt ₦92,500, report-card snippet, parent message, class roster avatars) arranged
  playfully, gently drifting (pause control). The mark's four-squares + path as a graphic motif. Modules as colourful
  tiles; workflows as a "school day" story of three cards; roles as pill tabs with big cards; website moment as phone +
  laptop showing the Kingsway site; rounded pricing cards with a featured navy card; FAQ as rounded accordion items.
- **Signup:** conversational — one focused question group per screen, large Bricolage question (~32px), 48px inputs,
  segmented pill progress at top; on desktop a **school ID-card preview** builds on the right (coloured monogram tile,
  name, address chips); on creation the card settles with the amber dot (no confetti). **Onboarding:** a "setup
  checklist home" — card grid of the 5 steps with a progress ring ("2 of 5 done"); each step opens as a focused panel
  with suggestion chips and friendly helper text, then returns to the checklist with the card ticked.
- **Dashboard shell:** shadcn `Sidebar variant="floating" collapsible="icon"`: the sidebar is a white rounded card
  (16px radius, soft shadow) floating 12px from the viewport edges; module groups headed by their colour tile; items
  as rounded pills; active = navy filled pill with white text; collapses to a floating icon rail. No hard header bar:
  a header row on the background with page title/greeting, rounded pill search, term chip with amber dot ("First Term ·
  Week 4"), bell with amber unread dot, avatar. Content cards white with soft shadow. Mobile: bottom tab bar (Home,
  Students, Finance, Search, More) + "More" opens a sheet with the full nav.
- **Tables (card table):** table inside a white rounded card; 56px rows; avatar circles tinted by arm; name bold with
  guardian beneath; fully rounded tinted badges; quick filters as segmented pill tabs with counts ("All 486 · Enrolled
  451 · New 64 · Needs classification 3"); row actions appear on hover as icon buttons; **mobile → stacked cards**.
  Bulk bar = floating navy pill bottom-centre.
- **Sheet:** floating sheet inset 12px from the edges, 20px radius, soft shadow; header with a coloured icon tile;
  sections as soft cards; pill buttons in the footer.
- **Dialog:** 20px radius, centred icon tile at the top (rose tile for destructive), friendly copy.
- **Website builder:** "guided studio": first screen is the template picker with big preview cards; the editor has a
  left floating panel with pill tabs (Sections / Style / Pages / SEO), sections as rounded cards with toggles and drag
  handles, canvas centred with a floating bottom toolbar (device, undo/redo, zoom) and a floating top-right Publish pill;
  style panel with friendly swatch picker and preset cards (Classic academic, Bright campus, Sunlit family, Executive
  campus).
