# Shared mobile filter sheet implementation — 2026-10-06

Status: Completed locally; no commit, push or deployment requested/performed.

## Migration contract

- Trigger: list search/filter controls below 768px; approved option 02.
- Outcome: one shared bounded sheet, one-open groups and summaries, draft until
  Apply, Reset draft only, dismissal discards changes while retaining search.
- State: consumer's URL/local state and permissions are authoritative; sheet
  state is ephemeral. No schema/API/auth changes or new query keys.
- Desktop: retain dropdown/select/chip interfaces and immediate selection.
- Package: shared presentation/pure model/date control under the existing UI
  package; app adapters preserve search debounce, schema multiplicity and setters.
- Acceptance: 320px/390px/desktop, single/multiple/date/linked filters, dismissal,
  focus and scroll ownership, async states and audit of existing consumers.

## Source coverage / conformance audit

| Surface | Integration | Preserved semantics |
| --- | --- | --- |
| Students, approvals via shared student header | dashboard SearchFilter adapter | async metadata, scalar status, admission arrays, session/term linking, enrollment dates, classroom/class scope |
| Classrooms and subjects | UI package SearchFilter adapter | query schema, View by, search, existing desktop dropdowns |
| Report roster | dashboard SearchFilter adapter | term/classroom, subjects, print status, existing URL schema and print selection |
| Staff directory | legacy wrapper delegates to adapter | status URL, search debounce, existing actions |
| Finance workspace | MobileFilterButton | period default term, account type/health arrays, URL setter/sort/pagination |
| Account detail and transactions | MobileFilterButton | status/type, search, existing pagination |
| Accounting streams | MobileFilterButton | term/session local period |
| Inventory and collection students | MobileFilterButton | type/status, local filtering |
| Promotion and progression | MobileFilterButton | existing status scope and search; source/target workflow selectors retained |
| Legacy migration page | MobileFilterButton | view/enrolled-in/term/class cookie state; single refresh at Apply |
| Assessment results | MobileFilterButton | permitted classrooms and subject array, existing classroom-change callback |
| Report term/class controls | MobileFilterButton + draft classroom query | allowed IDs, clear classroom on term change, existing print-state reset |
| Import review classroom strip | MobileFilterButton | existing local scope callback; display-only badges retained |

Search-only bills/student fees/fees-management, payroll, service payments,
finance/ledger/stream table headers and basic staff/teacher forms remain search
inputs without invented groups. Global command search, payment/record pickers,
workflow setup/context selectors, summary drilldown actions, sorting and print
selection are not list filter menus. The questions filter component is inert.
CMS exposes no list search/filter menu to migrate. Existing shared SearchFilter
consumers receive the same presentation automatically; no parallel per-page sheet
implementation was added. Unrelated worktree changes were preserved.

## Verification

- `bun test` on mobile-filter-model, date-filter-model, student enrollment model
  and student URL parser: 17 passing tests. Covers immutable patches/arrays,
  query preservation, Reset/defaults/summaries, linked dependencies and dates.
- Focused Biome: six new shared/model/test files and rewritten wrapper pass.
- `git diff --check`: pass.
- `bun run typecheck`: fails in the existing shared/site-nav React/csstype
  dependency diagnostics. Direct dashboard TypeScript check reports 97 existing
  diagnostics, including promotion's pre-existing missing AlertTriangle and import
  row gender typing. The introduced missing import for MobileFilterButton was
  corrected; final output has no diagnostic in the new filter components/adapters.
  A full green typecheck/build is not claimed.
- Active cmux/Portless local stack reused; proxy configuration unchanged.
- Authenticated student QA: draft choices leave URL unchanged; status plus
  New admission/Returning plus October 5–9 custom range apply together. Reset
  leaves URL unchanged until Apply and preserves q. Linked session/term choices
  resolve from draft metadata; switching session clears the incompatible term.
  Close, Escape and backdrop discard drafts; reopening restores applied state.
  Unsubmitted search survives dismissal. Focus wraps Close/Apply, returns to the
  trigger, body lock clears, footer remains visible.
- 320×740 sheet: 320px width and scrollWidth, 88dvh height, 44px footer buttons,
  separate scrolling body and visible footer. 390×844 accordion/summaries captured.
  Desktop 1280×900 retains nested dropdown; selecting status updates URL immediately.
- Staff status and classroom View by each tested through draft then URL Apply.
  Report roster rendered with existing options/search/print controls.
- Real shared-component fixture with synthetic metadata: 24 assignees, option
  search, retained selection, multi-select Apply, loading disables Apply, error
  Retry restores controls, empty state is dismissible. Removed temporary app route;
  fixture source/screenshot retained only under artifacts for reproducibility.

Coverage limits: Finance is disabled in this tenant; finance and other less common
local adapters were audited in source rather than exercised with real records.
No live assignee metadata exists here; assignees were exercised in the shared
component fixture. Existing dev hydration overlays (theme script/account initials
and cached labels) occurred during hard reload; their dismissal allowed stable QA.
No claim of all-routes browser testing or baseline hydration repair. No school
record, financial or permission writes were performed.

## Brain impact

Created this record, mobile-search-filters feature and ADR-0071; linked the feature
from Brain index and affected feature docs and recorded completion in done.md.
No API/database documentation updates: contracts, permissions and schema unchanged.
Evidence: `artifacts/mobile-filter-sheet/`.
