# Student screen design review — 2026-10-06

## Status

Saved for later by owner instruction on 2026-10-06. The workshop preview server
(exec session 68744) was stopped successfully; artifact files remain available.
The owner prioritised fixes to scrolling and checkbox alignment on the current
Students page. Three responsive mockups were delivered; no direction is approved.
Implementation is explicitly deferred until after review. Existing compact
summary and toolbar changes from the earlier task are preserved.

## Scope and references

The owner requested three alternatives for the Students screen currently open
at `/students/list`, mobile responsiveness, and an agent recommendation.
The previews use synthetic student records, including Arabic and long names.
Counts reflect the screen observed for context; they are static in the mockup.
Search, class filtering, enrollment scope, selection, and profile previews are
local demonstrations. Action buttons explain their existing target workflows;
they do not modify school records or invoke APIs.

The editable inline preview is:
`/Users/M1PRO/.codex/visualizations/2026/10/06/01a110d0-1522-7180-aa3b-f5c7fe6a8da9/student-screen-options.html`

The persistent design archive is:
`/Users/M1PRO/.gstack/projects/ishaqyusuf-school-clerk-oss/designs/students-20261006/student-screen-options.html`

## Alternatives

- **Focused roster — recommended.** Neutral green palette and system sans,
  compact summaries, prominent search, desktop sidebar/table, and readable
  mobile rows. Best fit for routine lookup and the existing dashboard.
- **School register.** Warm paper/rust palette, Georgia headings, class index
  beside the desktop register and class buttons above the mobile list.
  Strong class-oriented browsing; a larger visual departure.
- **Operations desk.** Blue palette and Trebuchet, horizontal navigation,
  dense roster with approvals/checks in a desktop side rail that moves above
  the mobile list. Strong task visibility, but a longer path to mobile records.

## Responsive and review behavior

The carousel contains three separate complete designs. Preview controls offer
responsive width, 390px phone and 320px small phone, plus app/light/dark appearance.
Container queries reflow each design below 760px; the narrowest text fields
use 16px type. Mobile rows retain name, ID, class and enrollment status.
No results and long-name states are included. The host provides the carousel
and preview-control runtime. No external resources or API requests are used.

## Verification and limits

HTML parsing confirms all three named variants. The JavaScript syntax was
checked with Bun's browser bundler. Layout is authored with responsive container
queries; browser-rendered visual acceptance remains part of this owner review.
The in-app browser blocks direct `file:` pages, so these previews are delivered
through the supported inline mockup surface. No server or app route was added.

## Next step

### Workshop link — 2026-10-06

Owner requested a direct Workshop link. The existing three designs were
exported to `artifacts/student-screen-workshop/index.html` with the bundled
sandboxed standalone renderer. A single-page local preview is running at
`http://127.0.0.1:64354/` (exec session 68744); keep it running during review,
and stop only this process after the final decision. The link is local to the
owner's computer and valid while this process runs.

In-app browser verification switched through all three options and exercised
sample search (Amina returned one record, clearing restored five). The tab is
left open on Focused roster; a screenshot is saved at
`artifacts/student-screen-workshop/workshop-preview.png`. The inline interaction
also selected Focused roster. This records interest, not implementation approval.

Collect the owner's preferred direction and requested refinements. Implement
only after their review, preserving the current tenant-scoped queries, URL
filters, permissions, virtualized table, and existing registration/import sheets.
The agent recommendation is not owner approval. No ADR is created yet.
