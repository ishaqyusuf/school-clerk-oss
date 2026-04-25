# Find Anything

## Status
Implemented: 2026-04-25

## Overview
SchoolClerk now has a Midday-style global command palette inside the dashboard shell. Users can open it from the header or with `Cmd/Ctrl + K` to jump to pages, quick actions, student records, and staff records.

## Key Files

| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/search/open-search-button.tsx` | Header trigger |
| `apps/dashboard/src/components/search/search-modal.tsx` | Global dialog host + hotkey |
| `apps/dashboard/src/components/search/search.tsx` | Command palette UI and result grouping |
| `apps/dashboard/src/components/search/search-catalog.ts` | Local page/action catalog sourced from dashboard navigation |
| `apps/dashboard/src/store/search.ts` | Zustand open/close state |
| `apps/api/src/trpc/routers/search.routes.ts` | Tenant-aware optimized student/staff search |
| `packages/db/src/schema/migrations/20260425164000_find_anything_search_indexes/migration.sql` | `pg_trgm` and search indexes |

## Search Design
- `Pages` and `Quick Actions` are resolved locally from the dashboard navigation registry for instant results.
- `Students` and `Staff` are resolved through a dedicated tRPC search router.
- People search only starts after 2 characters to reduce avoidable database load.
- The router ranks exact and prefix matches ahead of trigram similarity matches.

## Optimization Notes
- Search is tenant-scoped by `schoolProfileId`.
- Queries are limited to a small result count to keep latency predictable.
- Trigram GIN indexes back fuzzy matching on:
  - student full-name expression
  - staff name
  - staff email
- Partial indexes only cover active rows where `deletedAt IS NULL`.

## Future Expansion
- Add finance and classroom records as additional dedicated search sources.
- Add recent items or pinned shortcuts for zero-query personalization.
- Expand role/module gating to align with the broader tenant module engine.
