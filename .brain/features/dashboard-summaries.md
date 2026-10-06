# Responsive dashboard summaries

## Behavior

Existing dashboard summary groups use two equal columns below the existing
`md` breakpoint (48rem / 768px), 8px gaps and 12px card padding. Every existing
metric remains visible; the last card spans both columns for an odd count.
Labels use 12px text and large values use 18px text. Long values wrap rather
than truncate, abbreviate or introduce horizontal scrolling. School Clerk's
existing light/dark color tokens and desktop utility classes remain authoritative.

This is an opt-in presentation contract in
`apps/dashboard/src/styles/summary-cards.css`, imported by `globals.css`.
`data-summary-grid` identifies a group; `data-summary-header`,
`data-summary-body`, `data-summary-label` and `data-summary-value` identify
card parts without changing shared shadcn source. Add these only to existing
summary surfaces, never whole pages, forms, charts or table rows.

`SummaryNumber` keeps the existing animated desktop number and renders the
same complete formatted currency as wrapping text on mobile. The two variants
are mutually exclusive in CSS. The legacy finance summaries retain their
existing desktop formatter through the optional children slot.

## Coverage audit — 2026-10-06

39 opted-in groups across 35 implementation files:

- Home dashboard and its streaming skeleton.
- Academic overview, legacy academic edit summary, promotion and progression.
- Student directory totals, duplicate/affected counts, student overview,
  attendance history and transaction overview.
- Staff directory, shared non-teaching/department/attendance summaries,
  staff profile header and overview with both matching skeleton groups.
- Shared teacher workspace summaries, classroom attendance sessions,
  attendance session detail, subject assessments and subject overview.
- Finance workspace, overview and totals, stream/account detail,
  reconciliation, transactions, legacy finance dashboard, accounting streams,
  payroll, service payments and transfer-manager page totals.
- Collections, inventory, enrollment-management totals and website CMS counts.

Finance's shared skeleton accepts a count: the workspace requests four cards;
stream detail and reconciliation retain three. Existing skeleton placeholders
are constrained to the available card width.

Ordinary record grids, transfer row metadata, salary structure details,
form fields, quick-action grids, charts and pages without summaries were
excluded. Some covered legacy components are not mounted by current canonical
routes; their existing summary markup was updated without adding routes or data.
No queries, mutations, filters, permissions or metric calculations changed.

## Verification

In-app browser QA reused the active shared Portless HTTPS stack. Live checks
covered home, academic overview, student directory, staff directory and staff
profile. Student search submission (`?q=QA`), clearing and opening filters were
exercised without writing school records. Mobile light/dark screenshots and
1280px desktop checks were captured. A temporary fixture rendered the real
finance/academic/number components plus skeleton examples; 320, 390, 767, 768
and 1280px checks cover long/negative/zero values and odd/even card counts.
Measurements confirmed two equal columns, 8px gaps, 12px padding and no summary
content overflow at narrow widths. At 768px the original desktop rules resume.
Artifacts and the complete limits are in `artifacts/mobile-summary-qa/README.md`.

Live finance data verification was unavailable because the local tenant has
Billing and finance disabled; no module setting was changed. Existing broad
TypeScript and obsolete `next lint` failures remain outside this presentation
change. The academic page's existing narrow header/history width issue is
outside the summary grid; its card content itself fits.
