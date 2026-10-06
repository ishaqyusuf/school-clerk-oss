# Student Directory

## Status

Implemented: 2026-06-19

Midday table migration completed: 2026-07-28

## Overview

### Profile and gender corrections — 2026-09-08, implemented but untested

Basic editor and gender API now share live-authorized atomic profile/guardian/open-term-fee updates. Closed-term fees are preserved; canonical demographics can still appear changed in reports that use current identity. Missing/ambiguous academic links and unsafe shared/login-bound guardian changes require review rather than partial saves. No contacts are resurrected and no login is reassigned. The shared-guardian editing location/confirmation choice is pending (ADR-0058).

The editor and reusable gender control use a scoped provider mutation hook with no retry/offline queue, current-view callbacks, shared record/finance/report invalidation and visible recovery. Footer/control copy explains financial effects; narrow-screen save layout, labelled 44px controls and wrapping errors are written. All browser/mobile/keyboard/visual checks remain deferred; no claim that the reusable gender control is currently mounted elsewhere. Import reconciliation and broader portfolio work stay open.

### Admission classification — 2026-09-08, implemented but untested

Single/bulk classification delegates to a fresh-authorized, whole-batch Serializable service. Admin/Registrar need Students, Academics and Finance; closed academic terms/ledgers, missing ancestry, duplicates and unbound historical charges require review rather than partial updates. Classification and fee reconciliation are atomic; paid/manual/waived/allocated/ledger-linked records remain (ADR-0057).

Directory confirmation uses a scoped single-flight hook, no retry/offline queue, current-context callbacks and student/finance invalidation. It retains errors, explains fee additions/cancellations/protected history, blocks incomplete/oversized selections and competing bulk actions, and provides labelled touch controls and wrapping recovery text. Success distinguishes changed/already-classified rows and fee counts. Browser/mobile/keyboard/visual verification remains deferred. Gender/basic-profile/import writers and wider finance boundaries remain open.

### Shared deletion — 2026-09-08, implemented but untested

Directory and overview deletion now use a shared scope-bound single-flight hook and a DB-owned Serializable soft-delete service, also used by the dashboard server action (ADR-0051). Fresh Admin/Registrar + Students access is required; affected active academic rows additionally require Academics. Conflicting ownership or partial archived state is surfaced for review. Canonical and related academic archives are atomic; guardians, assessments, attendance and financial records remain, and balances are not cancelled.

Confirmation copy explains retention, row errors keep the dialog open, controls wrap with 44px targets, and overview shows inline recovery before closing its sheet/returning to the directory on success. No retry or offline mutation queue is used. Relevant caches are invalidated and late responses cannot navigate a changed scope/student. These are source changes, not verified browser/mobile behavior. Separate term deletion, class movement and the full portfolio remain unfinished; all tests are deferred.

### Registration boundary — 2026-09-08, implemented but untested

Registration now uses a dedicated live-authorized API transaction and DB-owned target/guardian/persistence helpers (ADR-0049). Admin/Registrar require Students; selecting a class also requires Academics + Finance; receiving a payment additionally requires the existing Admin finance-writer permission. All terms must be open and owned by the selected school/session/classroom. No-class registration creates only the canonical student/optional guardian. Guardian identity collisions are surfaced rather than revived or silently changed. Student/academic/charge/payment writes roll back together, and fees retain initial-term-only behavior.

The create sheet resets its draft/results on school, user, login session or academic selection change, withholds unavailable identity, and submits a matching scope. Footer status/errors wrap with 44px actions and interrupted-request guidance. Preview readiness remains mandatory for enrollment/payment submission. No browser/mobile verification is claimed. Legacy create/import/repair writers and remaining CORE-002 coverage are still open; all testing remains deferred.

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
- Student create and basic-info forms display birth dates as `dd MMM yyyy`,
  prevent future birth-date selections, and reopen the calendar on the selected
  month for efficient review and correction.
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

## Attendance quick registration — 2026-10-05

The administrator classroom attendance recorder reuses the existing secondary student form, preselecting classroom, session and term. Its existing name search can enroll a suggested student; creation and enrollment both close the secondary sheet and refresh attendance/classroom counts. The attendance draft remains mounted. The secondary form has stable defaults and is keyed to school/user/login-session/academic/classroom context. Ordinary directory registration keeps its success/payment controls. Live authorization and scope guards remain in force. Daarul Hadith administrator QA passed both creation and suggested-record enrollment with immediate attendance refresh. See ADR-0064 and ADR-0065.

## Registration without Finance and mobile birth date — 2026-10-05

Classroom registration/enrollment requires Student Management and Academics. Live effective Finance access controls fee preview and automatic fee application. Without Finance, the form hides fee/payment controls, skips preview and explains that registration creates no financial entries; the server rejects any optional fees or payment entries. Unknown/unconfigured module policy blocks submission. Finance-enabled behavior retains existing fee/payment checks. Six focused registration-policy tests pass; no entitlement/module setting or schema changed.

The shared student form opts its date-of-birth control into a shadcn Drawer on mobile (<768 px), with accessible title/description, month/year selectors, future dates disabled and Cancel. Picking a date updates the field and closes only the calendar. Desktop keeps its popover. Verified at 390 × 844 and 1280 × 900.

## Shared compact calendars — 2026-10-05

Calendar presentation now comes from shared CalendarPopover: shadcn bottom sheet on mobile and popover on desktop. FormDate defaults to this behavior everywhere; attendance, date ranges and date filters reuse it. Shared native date Inputs also open the mobile sheet while retaining form events/constraints. Mobile layout uses more width, larger day buttons and tighter header/week/footer spacing. Date ranges show one month on mobile. See ADR-0066 for boundaries and verification.

## Compact summaries and mobile toolbar — 2026-10-06

The directory's four totals and three duplicate-check metrics follow the shared
[responsive summary contract](dashboard-summaries.md). The existing Affected
metric is now visible on mobile, spanning both columns as the third card.
Below 768px, search fills the available width, active filter chips wrap beneath
it, and Approvals plus the three icon actions fill the following row with 44px
controls. Desktop search width and action alignment are retained. The shared
search filter accepts an optional layout class, has an accessible filter-button
name and caps its popup to the viewport. Search/filter/query behavior and
permissions remain unchanged. In-app browser checks exercised search and
filters at 320/390px in both themes and verified the existing 1280px layout.

## One page scroll and centred selection — 2026-10-06

The directory opts into page scrolling: vertical gestures over the roster move
the document and load additional cursor pages near the visible row range's end.
Rows remain virtualized using the window viewport and measured table-body
offset. The table grows in height and retains horizontal scrolling for wide
columns. Page scrolling is now the default; the classroom overview sheet
explicitly requests container scrolling. See the shared
[dashboard table contract](dashboard-tables.md) and ADR-0073.
Selection checkboxes are centred consistently in their 50px header/row column.

In-app browser checks passed at 320px, 390px and 1280px: zero nested vertical
scrollers, successive cursor loads, non-empty virtual rows after scrolling and
resizing, single/all selection, indeterminate state, deselection, no-result search
and recovery. See ADR-0072 and `artifacts/student-scroll-qa/README.md` for the
scoped Midday adaptation and validation limits. No API or permission changes.

## Shared mobile filters — 2026-10-06

Existing list filters use the [shared mobile filter sheet](mobile-search-filters.md)
below 768px, with draft/Apply/Reset and desktop controls retained. Coverage and
verification limits are recorded in the linked task record. Domain query schemas,
permissions and data writes are unchanged.
