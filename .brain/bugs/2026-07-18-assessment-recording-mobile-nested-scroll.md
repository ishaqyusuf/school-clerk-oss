# Assessment Recording Mobile Nested Scroll

## Symptom

At mobile viewport sizes, the authenticated assessment recording page had both a document-level vertical scrollbar and an independently scrolling score table. Moving through student rows could scroll the wrong container or chain between the two containers.

## Root Cause

The score table used a viewport-derived maximum height even though it started below the dashboard header and a wrapping mobile toolbar. The recording page also added a large bottom margin, so the resulting page exceeded the viewport while the table remained independently scrollable.

## Resolution

The score table no longer has a viewport height cap, an overflow container, or an extra wrapper that could become a competing scroll surface. Assessment recording stays in the standard dashboard document flow and uses the document as its only vertical scroller and visible scrollbar. The search and filter controls scroll away normally, while only the opaque two-row table header remains sticky at the top of the viewport. A fixed table layout and narrower mobile Student column prevent long names from widening the page.

## Verification

- Prettier and `git diff --check` pass for the changed dashboard components and Brain docs.
- A scoped source audit confirms the recording table has no viewport height cap or vertical overflow class; the remaining `overflow-auto` belongs only to the subject-editor dialog.
- In-app browser inspection confirms the deployed page's duplicate scrollbar comes from the old `max-h-[calc(100vh-180px)] overflow-auto` table wrapper. The local implementation removes that wrapper so the document is the only vertical scroll owner.
- Full dashboard typecheck and local browser QA are currently blocked by an unrelated stale Prisma client for the in-progress `academicDataDirectionMode` schema change. `bun run db:generate` was attempted without database writes but was killed with exit code 137.
