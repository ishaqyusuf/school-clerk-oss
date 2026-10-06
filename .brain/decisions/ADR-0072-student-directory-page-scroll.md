# ADR-0072: Student directory uses page scrolling

Date: 2026-10-06
Status: Accepted, explicitly requested by owner

Update: [ADR-0073](ADR-0073-dashboard-table-page-scroll.md) extends this decision
to other dashboard pages. Page mode is now the default; the classroom overview
sheet explicitly requests container mode.

## Context

The student directory followed Midday's customer-table pattern: a fixed-height
overflow container with element-based virtualization and infinite loading.
The School Clerk dashboard also scrolls the document, so the directory exposed
two vertical scroll surfaces. The owner requested one page scroll that continues
through the roster and loads more students, plus centred selection checkboxes.

## Decision

The directory route opts into `DataTable`'s `scrollMode="page"`. TanStack's
window virtualizer renders the visible row range, measuring the table body's
document offset as its scroll margin. That margin is subtracted when positioning
rows within the table body. A body ResizeObserver and window resize listener
refresh the offset when the responsive header or filters change height.

The existing infinite-scroll hook accepts a Window or HTMLElement event target
and depends only on the virtualizer's `getVirtualItems` method. It retains the
same cursor query, threshold, fetching guard and single-page behavior.

Page mode has an unrestricted height and horizontal overflow for wide columns.
The table and its header travel with the document vertically. Container mode
remains the default for classroom embeds; this is a scoped exception to the
Midday reference's fixed-height viewport, authorised by the owner's request.

The 50px selection column removes asymmetric shared-cell padding. Row content
uses a centred flex wrapper, and the header explicitly uses the same centring.
Shared shadcn components and other table column layouts are unchanged.

## Verification

The in-app browser confirmed one document scroll at 320px, 390px and 1280px.
Scrolling over the table advances window scroll while table scrollTop stays 0;
table height grows as cursor pages arrive. Visible rows remain virtualized.
Single-row selection, header indeterminate state, select-all, deselection,
empty search and recovery passed. Header and row checkboxes are centred within
0.5px of their cell centres (the one-pixel border accounts for the remainder).

Focused unused-import lint passes. Root and dashboard typechecks retain existing
shared React/CSS and API/generated-client errors. The student header's existing
CSSProperties incompatibility is confirmed in the pre-change typecheck log.
The dashboard lint script still invokes unsupported `next lint`.
