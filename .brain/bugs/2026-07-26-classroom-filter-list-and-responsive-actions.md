# Classroom Filter List And Responsive Actions

## Symptom

The classroom index showed a standalone `View by` selector, while the filter button inside classroom search opened an empty menu. On medium and smaller screens, `Import from Session` and `Add Classroom` also competed with the search control for toolbar space.

## Root Cause

`ClassroomHeader` explicitly passed an empty `filterList` to the shared search-filter component. The classroom filter API only supplied the text-search field, which the menu intentionally excludes because search already has a dedicated input. The remaining `View by` setting lived in a separate select, leaving the filter menu with no visible entries.

The toolbar also rendered both action buttons at every breakpoint and had no compact action-menu variant.

## Resolution

The classroom header now supplies a typed classroom filter list containing text search and a `View by` filter with Stream and Class choices. Stream remains the implicit default when no view query parameter is selected. Scalar filter tags now resolve their configured display label, so the active tag reads `Class` or `Stream` instead of the raw query value.

Large screens retain the direct `Import from Session` and `Add Classroom` buttons. At the medium breakpoint and below, a `More` dropdown exposes both actions and opens their existing dialog or sheet.

## Verification

- Dashboard and shared UI package typechecks pass, together with the focused scalar filter-label regression test.
- Live browser QA confirmed the filter menu exposes `View by`, selecting Class writes `?view=class`, and the classroom list switches to grouped class cards.
- At a 768 × 900 viewport, only `More` is shown; its two menu items successfully open the Add Classroom sheet and Import from Session dialog.
- The responsive viewport override was reset, and the large-screen toolbar was rechecked with both direct action buttons visible.

## Related Files

- `apps/dashboard/src/components/classroom-header.tsx`
- `apps/dashboard/src/hooks/use-classroom-filter-params.ts`
- `packages/ui/src/components/custom/search-filter/filter-list.tsx`
- `packages/ui/src/components/custom/search-filter/filter-label.ts`
- `packages/ui/src/components/custom/search-filter/filter-label.test.ts`
- `.brain/features/academic-structure-engine.md`
