# Student Directory

## Status

Implemented: 2026-06-19

Midday table migration completed: 2026-07-28

## Overview

The canonical student directory is `/students/list`; `/students` preserves its
query string and redirects there. The page uses the shared dashboard table core
and a single virtualized table surface rather than separate grid and list
implementations.

The shared `tables/core` layer provides reusable bottom-bar, empty-state,
skeleton-cell, table-skeleton, table-grid, type, and virtual-row primitives.
The Midday-aligned table support layer also includes draggable headers,
persisted column order/sizing/visibility/dividers, URL-backed sorting, sticky
columns, row selection, infinite loading, and RTL-aware logical positioning.

## Key Files

| File                                                             | Purpose                                                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/dashboard/src/components/tables/core/*`                    | Shared table loading, empty, virtual-row, selection, sticky, and bulk-action primitives |
| `apps/dashboard/src/components/tables/draggable-header.tsx`      | Reorderable table header cell                                                           |
| `apps/dashboard/src/hooks/use-table-dnd.ts`                      | Persistable TanStack column reordering behavior                                         |
| `apps/dashboard/src/hooks/use-sort-params.ts`                    | URL sort parser and server loader                                                       |
| `apps/dashboard/src/hooks/use-sort-query.ts`                     | Three-state ascending/descending/clear sort control                                     |
| `apps/dashboard/src/components/tables/students/data-table.tsx`   | Virtualized student directory with infinite loading and row selection                   |
| `apps/dashboard/src/components/tables/students/columns.tsx`      | Student, class, enrollment, identity, guardian, and action columns                      |
| `apps/dashboard/src/components/tables/students/table-header.tsx` | Sticky, sortable, reorderable, resizable table header                                   |
| `apps/dashboard/src/components/tables/students/bottom-bar.tsx`   | CSV export and role-gated bulk enrollment actions                                       |
| `apps/dashboard/src/components/tables/students/actions-menu.tsx` | View, edit, remove-current-term, and delete actions                                     |
| `apps/api/src/trpc/schemas/students.ts`                          | Typed list filters, pagination, and sort allowlist                                      |
| `apps/api/src/db/queries/students.ts`                            | Tenant-scoped list query and transactional bulk mutations                               |

## UX Notes

- Student search, column controls, import, and enrollment actions stay in the
  compact directory header.
- Directory filters include linked enrolled-session and enrolled-term lists plus
  an enrollment-date range with relative presets. Filter state remains in the
  URL so it survives reloads, pagination, and shared links.
- The table includes select, student, student ID, class, gender, status, DOB,
  guardian, phone, and actions columns. Less frequently used identity and
  guardian columns are hidden by default and can be enabled.
- Select and student columns remain pinned to the logical start edge; actions
  remain pinned to the logical end edge. Direction-aware styles preserve the
  same behavior in RTL workspaces.
- Sort state is shareable in the URL and cycles through ascending, descending,
  and cleared states. Supported fields are student name, gender, DOB, and
  creation date.
- Selecting rows opens a shared bottom bar. All permitted users can export the
  selected loaded rows to CSV. `ADMIN`, `Admin`, and `Registrar` users can move
  current-term enrollments to another class or remove them from the term.
- A row opens the existing overview sheet through `studentViewId`. Row actions
  reuse the existing overview and focused edit sheets through `studentViewId`
  and `studentEditId`.
- The classroom student embed may continue to pass its legacy `grid` prop for
  compatibility, but the shared student data surface now renders the table.

## Data Behavior

- `students.index` requires authentication and derives tenant scope from the
  active school profile. Canonical students and related rows must be
  non-deleted and tenant-owned.
- The query retains the `{ data, meta.cursor }` infinite-list contract and uses
  a maximum page size of 100.
- Search covers student name parts, student ID, and the first tenant-owned
  guardian name or phone.
- Classroom filters use stable classroom-department IDs and default missing
  session/term context to the active workspace.
- Explicit session or term filters require an active `StudentTermForm` in that
  period. Enrollment dates use `StudentTermForm.createdAt`; period, date,
  classroom, and admission criteria are evaluated against the same term form.
- Without an explicit period or enrollment date, the active workspace context
  continues to resolve displayed class and status without restricting the
  canonical directory to enrolled students.
- Sort fields are validated at the API boundary and translated to explicit
  Prisma order clauses with stable student-ID tie breakers.
- Each row includes the resolved display name, current scoped class, enrollment
  status, DOB, and first guardian summary required by the table.
- Bulk class changes run in one transaction, verify tenant ownership of every
  selected term form and target class, preserve the exact-duplicate guard, and
  synchronize the linked session form. Bulk term removal is tenant-scoped and
  soft-deletes only the selected enrollment rows.
- Admission status is read from the selected `StudentTermForm`. Directory rows,
  URL filters, and analytics use `UNCLASSIFIED`, `NEW_ADMISSION`, or
  `RETURNING` for that term rather than comparing `Students.createdAt`.
- Management roles can bulk-update admission status. The mutation validates
  every selected term form against the active tenant and reconciles
  admission-targeted fees in the same transaction.

## Architecture Notes

This change extends the existing shared table architecture and URL-backed sheet
model, so no new ADR is required.

The directory header remains server-rendered. Its URL-backed import and
enrollment action buttons declare leaf-level client boundaries before invoking
`nuqs` hooks, preventing client hook execution during the Server Component
render while keeping the rest of the header out of the client bundle.
