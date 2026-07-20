# Student Directory

## Status
Implemented: 2026-06-19

## Overview
The student directory renders the `/students` and `/students/list` pages through the shared dashboard table system in `apps/dashboard/src/components/tables/core`.

The directory supports both grid and table views. The grid/table mode, column sizing, column order, column visibility, and column divider preference are persisted through the shared table-settings cookie under the `students` table id.

## Key Files

| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/tables/core/*` | Copied gnd-style table primitives, including virtual rows, table skeletons, and grid rendering |
| `apps/dashboard/src/components/tables/students/data-table.tsx` | Student directory data surface using `trpc.students.index` infinite queries |
| `apps/dashboard/src/components/tables/students/columns.tsx` | Student table column definitions, row ids, skeleton metadata, sticky column metadata, and row actions |
| `apps/dashboard/src/components/tables/students/table-header.tsx` | Sticky/resizable table header with horizontal scroll controls |
| `apps/dashboard/src/components/tables/students/column-visibility.tsx` | Grid/table toggle plus column visibility and divider controls |
| `apps/dashboard/src/components/tables/students/store.ts` | Store that bridges header controls with persisted table settings |
| `apps/dashboard/src/components/tables/students/skeleton.tsx` | Student table skeleton backed by the core table skeleton |

## UX Notes
- The default student directory entry points continue to render grid view while allowing users to switch to table view.
- The `StudentHeader` exposes the grid/table toggle and column settings alongside search, import, and enrollment actions.
- Student cards keep the existing open, gender update, and delete workflows.
- Table rows open the existing student overview sheet through `studentViewId`.
- The table and grid cards consume the tenant's resolved academic data direction. RTL mode mirrors table flow, sticky identity edges, dividers, scroll controls, and record alignment without mirroring the English directory toolbar or actions.
- Student and classroom values use `dir="auto"` so mixed-script records retain their natural inline direction.
- Student display names use the tenant's configured `StudentNameFormat`; blank optional name parts are omitted.

## Data Behavior
- The directory continues to read from `trpc.students.index` with the existing student filter query params.
- Infinite loading still follows the existing `{ data, meta.cursor }` API contract.
- Student listing data and permissions are unchanged. Direction resolution comes from the separate tenant-scoped school settings contract.
- Name formatting is presentation-only and does not rewrite stored name parts or alter duplicate identity matching.
