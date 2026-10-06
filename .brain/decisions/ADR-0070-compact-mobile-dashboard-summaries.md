# ADR-0070: Compact mobile dashboard summaries

- Date: 2026-10-06
- Status: Accepted

## Context

The approved design shows all existing dashboard metrics in two compact mobile
columns, with an odd final card spanning both. School Clerk has shared and
custom summaries, several hidden on mobile, and loading states across domains.
Desktop composition and theme colors must remain unchanged.

## Decision

Use explicit `data-summary-*` attributes and one dashboard-local stylesheet
below 48rem. Keep each existing feature's component, card, data and desktop
classes. This follows Midday's feature-component/skeleton boundaries and
School Clerk's wrapper policy without modifying the shared shadcn Card source.
Use a small `SummaryNumber` adapter for wrapping mobile currency text while
retaining desktop animation or the legacy formatter. Match skeleton card
counts to the consuming page.

## Consequences

New summary implementations can opt into the same contract. Ordinary cards,
forms, charts and data rows are unaffected. Extremely long numbers may wrap
onto two lines but remain complete. No permission/data/schema change, new
metrics, dependency or deployment is involved. See
[coverage and validation](../features/dashboard-summaries.md).
