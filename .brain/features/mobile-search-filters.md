# Shared mobile search filters

Implemented locally on 2026-10-06 from approved workshop option 02, Expandable groups.
See [ADR-0071](../decisions/ADR-0071-shared-mobile-filter-sheets.md) and
[coverage and verification](../tasks/2026-10-06-shared-mobile-filter-sheets.md).

## Behavior

Below 768px, list filter controls open a bounded bottom sheet. Each group shows its
selection summary; only one accordion group expands. Options use radio buttons
for scalar parsers and checkboxes for array parsers. Lists longer than 20 options
include an accessible option search. The header and safe-area footer stay visible;
the middle scrolls. Close and options have at least 44px targets. Theme tokens,
focus trap, scroll lock, trigger focus restoration and reduced-motion classes are
shared. Desktop keeps the existing dropdown/select/chip controls and immediate
updates.

Every opening clones applied values into local state. Selection and Reset affect
only this draft. Apply submits a patch containing the sheet's group keys through
the consumer's existing setter; search, sort, pagination and other unrelated URL
keys are not copied back from an old snapshot. Existing setter/invalidation and
pagination behavior remain domain-owned. Closing, backdrop, Escape or changing to
desktop discards unapplied edits. The mobile sheet owns Escape so the legacy
global search-clear shortcut cannot erase the query on dismissal. Search stays in
the page and retains both submitted and unsubmitted input while filtering.

Student session/term dependencies use the existing pure enrollment model against
the draft. Selecting a term selects its parent session, changing session clears an
incompatible term, and clearing session clears term. Report classroom choices can
load for the draft term and remain restricted to the consumer's permitted IDs.
Assessment classroom options are the existing authorized options. No permission
or school-data mutation was added.

Date filters reuse one shared date model and range control: existing presets,
single-day/partial ranges and inclusive custom ranges serialize the same URL
arrays, including legacy comma-separated reads. Mobile shows one calendar in the
expanded group. Async metadata supports loading, empty, error and Retry. Apply is
disabled during metadata loading/error and while committing; commit errors keep
the editing session open.

## Ownership

`packages/ui/src/components/custom/search-filter/mobile-filter-sheet.tsx` owns the
presentation and ephemeral editing session. `mobile-filter-model.ts` owns pure
selection, reset, patch and summary operations. The UI package and dashboard
SearchFilter adapters translate metadata/schema multiplicity into that interface.
Legacy MiddaySearchFilter delegates to the dashboard adapter and keeps its
1500ms search debounce. Shared date exports replace the dashboard's duplicate
model while keeping its import path compatible. API contracts, database schema,
auth policy and filter query schemas are unchanged.
