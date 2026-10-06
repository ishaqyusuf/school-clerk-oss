# ADR-0073: Dashboard tables use document scrolling by default

Date: 2026-10-06
Status: Accepted, explicitly requested by owner
Extends: ADR-0072

The owner extended the student directory single-scroll and checkbox fix to other
dashboard table pages. Midday's bounded table viewport remains a reference,
but full-page School Clerk tables use natural height with horizontal overflow
so the document owns vertical gestures. Student window virtualization remains
the default; embedded sheet tables explicitly select container virtualization.

The remaining classroom result height cap is removed. Existing natural-height
tables and viewport load-more observers are retained. Shared TableGrid no longer
creates a fixed-height scroll surface unless a caller supplies a height.
Overlays keep their own bounded scrolling.

Dashboard CSS centers standalone checkbox-only cells without editing shared
shadcn source. Shared virtual rows and skeletons also center selection content.
Checkbox labels and form groups keep their own layout.

Coverage and verification limits are recorded in
[dashboard tables](../features/dashboard-tables.md). This changes table layout
only; query contracts, permissions, mutations and exports are preserved.
