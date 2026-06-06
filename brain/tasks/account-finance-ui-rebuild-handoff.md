# Account & Finance UI Rebuild Handoff

## Purpose
This document is a complete handoff for rebuilding the Account & Finance UI structure, sidebar navigation, route organization, and page information architecture. It is written for a fresh AI agent or engineer who has not read the original conversation.

The user believes the Account & Finance database/model work is strong, but the UI/navigation is poor. The requested work is a teardown and rebuild of the finance-facing product structure so it meets a professional school accounting standard.

## Current User Intent
The user wants the finance UI to stop feeling like a list of database tables and start feeling like a real finance office workspace.

Primary pain points:
- The sidebar links are poorly grouped.
- Fees Management and Service Billables are confusingly close in meaning.
- Finance pages expose implementation nouns instead of user workflows.
- Navigation does not make it obvious where to receive money, pay money, manage accounts, configure fees, or reconcile records.
- The database already supports a better product model, so the rebuild should mostly be UI, routing, naming, page grouping, and navigation registry work.

## Critical Domain Clarification
The next agent must preserve this conceptual distinction.

### Student Fees / Fee Structures
Student fees are money owed by students.

Use cases:
- tuition
- exam fees
- PTA levies
- books/uniform charges when billed to students
- term/class-specific fees
- anything collected through student payment/receipt flows

Relevant docs:
- `brain/features/student-fees.md`

Expected UI language:
- "Fee Structures"
- "Student Balances"
- "Receive Student Payment"
- "Collections"
- "Receipts"

### Service Billables / Payables
Service billables are school-side expense/service definitions, not student fees.

Use cases:
- service providers
- vendor expenses
- staff/service bills
- reusable school expense items
- operational payables

Relevant docs:
- `brain/features/stream-funding.md`
- `brain/features/finance-operations.md`

Expected UI language:
- "Service Billables" for reusable billable definitions
- "Payables" for actual obligations
- "Service Bills" for service obligations
- "Payroll Bills" for staff obligations
- "Owing & Repayments" for settlement-backed owing

Do not collapse Student Fees and Service Billables into one page. They may share finance item infrastructure internally, but they represent different jobs for the user.

## Existing Architecture And Files

### Product/Brain Docs To Read First
- `brain/features/student-fees.md`
- `brain/features/stream-funding.md`
- `brain/features/finance-operations.md`
- `brain/decisions/ADR-0004-navigation-registry-and-workspace-owned-sidebar-architecture.md`
- `brain/PROJECT_INDEX.md`

### Navigation Sources
There appear to be two navigation definitions in active use or transition. Audit before changing.

- `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts`
  - Newer typed registry-style navigation.
  - Contains finance module entries around lines where keys like `finance-student-fees`, `finance-fees-management`, `finance-billables`, `finance-bills`, `finance-payments`, `finance-streams`, and `finance-reconciliation` appear.

- `apps/dashboard/src/sidebar/utils.ts`
  - Older/app-local sidebar utility.
  - Currently contains finance links such as:
    - Dashboard -> `/finance`
    - Student Accounts -> `/finance/student-fees`
    - Fee Structures -> `/finance/fees-management`
    - Service Billables -> `/finance/billables`
    - General Collections -> `/finance/collections`
    - Bills & Expenses -> `/finance/bills`
    - Staff Remuneration -> `/finance/payments`
    - Transactions -> `/finance/transactions`
    - Account Streams -> `/finance/streams`
    - Internal Transfers -> `/finance/internal-transfers`
    - Reconciliation -> `/finance/reconciliation`

- `packages/navigation/src/*`
  - Shared navigation package defined by ADR-0004.
  - Should become the long-term source of truth where possible.

- `apps/dashboard/src/features/navigation/sidebar-modules.ts`
  - Check how the registry is adapted into the dashboard sidebar.

### Existing Finance Routes
Current route files are under:
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/student-fees/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/fees-management/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/billables/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/collections/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/bills/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/payments/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/transactions/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/streams/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/streams/[streamId]/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/internal-transfers/page.tsx`
- `apps/dashboard/src/app/[domain]/(sidebar)/finance/reconciliation/page.tsx`

### Existing Finance Components
Primary components live under:
- `apps/dashboard/src/components/finance/`
- `apps/dashboard/src/components/finance/forms/`
- `apps/dashboard/src/components/tables/finance-*`
- `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`

Important existing components:
- `FinancePage`
- `FinanceOverview`
- `FinanceOverviewStats`
- `FinanceQuickActions`
- `FinanceItemsPage`
- `FinanceChargesPage`
- `FinancePaymentsPage`
- `FinanceTransactionsPage`
- `FinanceTransfersPage`
- `FinanceReconciliationPage`
- `FinanceReconciliationView`
- `FinanceStreamDetailPage`
- `FinanceStreamDetail`

## Current Implementation Snapshot
This handoff began as a teardown/rebuild plan, but the current worktree already contains partial implementation. Treat the current worktree as authoritative.

Observed completed or partially completed work:
- `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts` already uses the new **Accounts & Finance** module grouping:
  - Overview
  - Receive Money
  - Receive Student Payment
  - Pay Money
  - Accounts
  - Setup
  - Reconciliation
- `apps/dashboard/src/sidebar/utils.ts` is also updated with the same Account & Finance grouping and canonical hrefs.
- Static inspection confirms the two observed finance nav sources are aligned on canonical hrefs and visible roles for Overview, Receive Money, Pay Money, Accounts, Setup, and Reconciliation. Runtime ownership still needs in-app verification.
- Canonical route files now exist for:
  - `/finance/receive`
  - `/finance/students`
  - `/finance/payables`
  - `/finance/payables/payroll`
  - `/finance/payables/services`
  - `/finance/payables/owing`
  - `/finance/accounts`
  - `/finance/accounts/[streamId]`
  - `/finance/accounts/transfers`
  - `/finance/ledger`
  - `/finance/setup/fees`
  - `/finance/setup/service-billables`
- Old high-confusion routes currently redirect:
  - `/finance/student-fees` -> `/finance/students`
  - `/finance/fees-management` -> `/finance/setup/fees`
  - `/finance/billables` -> `/finance/setup/service-billables`
  - `/finance/bills` -> `/finance/payables`
  - `/finance/transactions` -> `/finance/ledger`
  - `/finance/streams` -> `/finance/accounts`
  - `/finance/streams/[streamId]` -> `/finance/accounts/[streamId]`
  - `/finance/internal-transfers` -> `/finance/accounts/transfers`
- Old high-confusion route redirects now preserve query params using `redirectTargetWithSearch`, including `/finance/streams/[streamId]`.
- `apps/dashboard/src/components/finance/finance-payables-tabs.tsx` exists and provides Payables tabs.
- Deprecated hardcoded finance URLs were audited in dashboard/source packages; current source scan no longer finds direct references to old paths such as `/finance/streams`, `/finance/transactions`, `/finance/billables`, `/finance/bills`, `/finance/fees-management`, `/finance/student-fees`, or `/finance/internal-transfers` outside redirect route files and historical handoff text.
- Tenant page metadata now includes canonical Account & Finance route titles/descriptions and uses new labels for old redirect routes.
- Search now adds finance aliases for old and common terms such as `fees management`, `student fees`, `billables`, `bills`, `transactions`, `account transfers`, and `internal transfers`, while returning canonical route hrefs.
- Pay Money sidebar/navigation now directly exposes Service Bills and Owing & Repayments in both observed navigation sources.
- Finance overview now has a command-center pass using real overview data:
  - Money In / Money Out / Available Balance stats without fake trend values.
  - Student Receivables, Pending Payables, Account Risk, and Reconciliation attention cards.
  - Pending payable totals/counts, owing totals, accounts-at-risk count, and active billables are derived from the stream read model.
- Shared finance table pages no longer inject misleading generic actions by default:
  - Student Balances and Receive Student Payment explicitly show `ReceivePaymentAction`.
  - Payables, Collections, Service Bills, Owing, and Payroll no longer inherit "Create Charge" or "Record Payment" actions that do not match the workflow.
- Canonical route subtitles for Collections, Payables, Service Bills, Owing & Repayments, Payroll Bills, Fee Structures, Service Billables, Accounts, and Ledger have been rewritten around user jobs.
- Shared finance table headers now accept workflow-specific copy props:
  - Collections, Student Balances, Receive Student Payment, Payables, Service Bills, Owing & Repayments, and Payroll Bills pass matching table titles, search placeholders, and empty-state copy.
  - Fee Structures and Service Billables derive distinct table copy from their item filters.
  - The misleading `Add Fee` action is hidden on Service Billables until a true service-billable creation action is implemented.
  - Finance table headers now stack search/action controls on mobile instead of forcing a single cramped row.
  - Transfers now uses account-oriented wording instead of stream-oriented wording.
- Shared finance empty states now accept workflow-specific action labels/hrefs:
  - Student empty states point to Fee Structures when setup is required.
  - Collections points back to Student Balances.
  - Payables and Service Bills point to Service Billables setup.
  - Owing points back to Payables.
  - Payroll points to Staff Payroll.
  - Transfers points to Accounts.
- Service Billables now renders a service-only `CreateItemForm` instead of leaving the page without a clear create path.
- Account detail, reconciliation, overview, and route metadata now use finance-account wording instead of "Account Stream" or "finance streams" in visible copy.
- Active accounts/finance table copy now uses Account wording in visible headers and fallbacks:
  - The canonical route title, sidebar/nav label, route metadata, table header, account creation form, transfers form, ledger header, and reconciliation export action all say `Accounts`/`Account` instead of hybrid stream wording.
  - The Accounts table first column says `Account`, search says `Search accounts`, and fallback rows say `credit account` / `debit account`.
  - Charge and payment tables show `Account` instead of `Stream` for the receiving/affected account column.
  - Accounts empty state now navigates to Fee Structures instead of focusing a missing `finance-stream-name` input.
- Finance charge filters now support `type` and `excludeType` through the TRPC schema and database query:
  - `/finance/payables/services` can now filter true service bills by `FinanceItem.type === SERVICE`.
  - `/finance/payables` now uses `excludePayerType: STUDENT`, so All Payables includes school-side and staff obligations without mixing in student receivables.
  - Returned charge rows include `itemType` and `itemName` for future workflow-specific tables.
- `/finance/payables/payroll` now uses the charge/payable table instead of the payment-history table, so "Payroll Bills" shows staff remuneration obligations and balances. New `createStaffBill` records default to `SALARY` item type, while the page remains compatible with existing staff bills by filtering on `payerType: STAFF`.
- Finance charge rows now include a workflow payment action:
  - Student charges open the Receive Payment sheet with the student preselected when possible.
  - School/staff payable rows open the Finance Payment sheet with the charge preselected.
  - Fully paid, cancelled, or waived rows hide the payment action.
- The Finance Payment sheet now stays in payable context when opened for a school/staff charge:
  - Charge row actions pass `financePaymentPayerType` through the URL state when opening the sheet.
  - The initial charge query prefilters to the payer context for school/staff payables instead of loading student charges first.
  - It hides the student filter and disables the student search query.
  - It labels the selected item as `Payable`.
  - It restricts the dropdown to the same payer type as the preselected payable.
  - Recording a payment invalidates all finance charge list query variants so filtered payable pages refresh.
  - It uses `Record Payable Payment` as the submit label.
  - It treats a preselected charge as payable context while that charge is loading, preventing student-filter flicker on payable row actions.
- Payables tabs now use the same reader-facing labels as the sidebar/pages: `All Payables`, `Service Bills`, `Payroll Bills`, and `Owing & Repayments`.
- Static breadcrumb audit found no central finance breadcrumb renderer; finance labels currently come from page titles, route metadata, and navigation/search sources. If a finance breadcrumb component is introduced later, it should use the same canonical Account & Finance labels.

Known remaining gaps:
- Confirm which navigation source actually renders in the app; both visible sources are statically aligned, but runtime ownership still needs verification.
- Overview still needs runtime/design verification and may need richer backend read models for true overdue student balances and reconciliation issue counts.
- Breadcrumbs do not appear to have a central finance implementation in the current source; only runtime/header behavior remains to verify.
- Table header copy, first-pass empty-state actions, Service Bills/Payroll filters, and charge-row payment actions are aligned, but workflow-specific columns, secondary filters, and deeper actions still need a consistency pass.
- Some canonical routes are wrappers over existing generic pages. That is acceptable for migration, but Phase 3 should make them true workflow pages.

## Current Worktree Warning
At the time this handoff was written, the worktree was already dirty with many finance and navigation-related files modified or untracked. A future agent must not revert unrelated user or previous-agent work.

Before implementation:
1. Run `git status --short`.
2. Inspect only files needed for this task.
3. Do not run `git restore`, `git checkout --`, or destructive cleanup unless explicitly asked.
4. Treat existing modifications as user-owned unless clearly created in the current session.

Known recently touched files from this conversation:
- `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`
- `apps/dashboard/src/components/finance/forms/add-fee-sheet.tsx`
- `apps/api/src/db/queries/finance.ts`

Those recent changes were about Receive Payment stream allocation behavior:
- stream-specific description options
- price updates when stream/description changes
- mobile responsive Stream Allocations layout
- classroom id returned in student finance search

Do not overwrite those changes.

## Target Product Model
The Account & Finance UI should be organized by finance jobs, not tables.

Recommended module name:
- `Accounts & Finance`

Recommended finance workspace groups:

```text
Accounts & Finance
- Overview
- Receive Money
  - Receive Student Payment
  - Student Balances
  - Collections
  - Receipts & Payments
- Pay Money
  - Payables
  - Payroll Bills
  - Service Bills
  - Owing & Repayments
- Accounts
  - Accounts
  - Transfers
  - Ledger
- Setup
  - Fee Structures
  - Service Billables
  - Finance Items
- Reconciliation
  - Integrity Checks
  - Reports & Exports
  - Activity Log
```

Design rule:
- The sidebar should answer "what job am I doing?"
- Page titles should not require database/model knowledge.
- Do not put every table as an equal top-level link.

## Role And Permission Matrix
Do not widen finance access accidentally. Preserve existing authorization unless the user explicitly changes the finance role model.

Observed/current intended visibility from navigation files:

| Area | Route | Current visible roles | Notes |
|---|---|---|---|
| Overview | `/finance` | Admin | Command center and stream summary. Keep admin-only unless Accountant dashboard access is approved. |
| Receive Student Payment | `/finance/receive` | Admin, Accountant | Direct collection entry under Receive Money. |
| Student Balances | `/finance/students` | Admin, Accountant | Incoming-money receivables. |
| Collections | `/finance/collections` | Admin, Accountant | Reporting for collected student money. |
| Receipts & Payments | `/finance/payments` | Not currently exposed; route redirects to Payroll Bills | Reintroduce only after deciding whether this is student receipts, all payments, or audit history. |
| Payables | `/finance/payables` | Admin, Accountant | Outgoing obligations. |
| Payroll Bills | `/finance/payables/payroll` | Admin, Accountant in current nav | Sensitive. Reconfirm whether Accountant can see staff remuneration before shipping. |
| Service Bills | `/finance/payables/services` | Admin, Accountant in current nav | Verify service payable visibility is acceptable for Accountant before shipping. |
| Owing & Repayments | `/finance/payables/owing` | Admin, Accountant in current nav | Verify repayment/owing visibility is acceptable for Accountant before shipping. |
| Accounts | `/finance/accounts` | Admin | Keep admin-only unless account balance visibility is approved for Accountant. |
| Transfers | `/finance/accounts/transfers` | Admin, Accountant | Verify large-transfer approval still requires Admin when threshold is exceeded. |
| Ledger | `/finance/ledger` | Admin, Accountant | Read-only movement history is generally safe for finance staff. |
| Fee Structures | `/finance/setup/fees` | Admin | Setup/configuration, not collection. Keep admin-only. |
| Service Billables | `/finance/setup/service-billables` | Admin | Setup/configuration. Keep admin-only. |
| Reconciliation | `/finance/reconciliation` | Admin, Accountant | If maintenance actions are present, make action-level permissions stricter than page visibility. |

Implementation rule:
- Page visibility is not enough. Mutations for transfers, waivers, discounts, payment cancellation, bill payment, and reconciliation maintenance must still enforce server-side authorization.

## Recommended Canonical Route Map
Keep old routes working through redirects or temporary aliases. Do not break bookmarks.

```text
/finance
/finance/receive
/finance/students
/finance/collections
/finance/payments
/finance/payables
/finance/payables/payroll
/finance/payables/services
/finance/payables/owing
/finance/accounts
/finance/accounts/transfers
/finance/ledger
/finance/setup/fees
/finance/setup/service-billables
/finance/setup/items
/finance/reconciliation
/finance/reports
```

Suggested old route redirects:

```text
/finance/fees-management      -> /finance/setup/fees
/finance/student-fees         -> /finance/students
/finance/billables            -> /finance/setup/service-billables
/finance/bills                -> /finance/payables
/finance/payments             -> /finance/payments
/finance/transactions         -> /finance/ledger
/finance/streams              -> /finance/accounts
/finance/internal-transfers   -> /finance/accounts/transfers
/finance/reconciliation       -> /finance/reconciliation
```

Current redirect status:
- Implemented: `student-fees`, `fees-management`, `billables`, `bills`, `transactions`, `streams`, `streams/[streamId]`, `internal-transfers`.
- Current source scan is clean for deprecated hardcoded finance URLs in dashboard/source packages.
- Still inspect before final signoff: runtime behavior, query-param preservation, `payments`, `collections`, `reconciliation`, and browser navigation from table actions/quick actions.

Preferred redirect implementation:
- For old route files, use a tiny server component with `redirect("/new-route")`.
- Do not leave two independently maintained pages with old and new labels.
- If a route has query/search params that must survive, explicitly forward them with `redirect()`.
- If preserving query params is difficult, keep a temporary wrapper and document why.

Decision point:
- If the product team wants less route churn, phase 1 can change labels and grouping only, while preserving old route paths. Route migration can follow after validation.

Recommended approach:
- Phase 1: labels/grouping only.
- Phase 2: canonical routes + redirects.
- Phase 3: page consolidation and workspace redesign.

## Desired Page-Level IA

### 1. `/finance` - Overview
Purpose:
- Finance command center.
- Show what needs attention today.

Primary actions:
- Receive Student Payment
- Create Fee Structure
- Review Payables, or Create Service Bill once a dedicated create-bill action exists
- Transfer Funds
- Open Reconciliation

Content sections:
- Today's collections
- Student outstanding balance
- Open payables
- Available account funds
- Projected balance warnings
- Recent payments/ledger movement
- Finance actions needed

Components to inspect:
- `FinanceOverview`
- `FinanceOverviewStats`
- `FinanceQuickActions`
- `FinancePage`

Validation:
- A bursar/admin should know what to do next within 30 seconds.

### 2. `/finance/receive` - Receive Student Payment
Purpose:
- Dedicated entry point for the receive payment sheet/workflow.

Implementation options:
- Route page with student search + CTA opening `ReceivePaymentSheet`.
- Or route that immediately opens the existing sheet with `receivePayment=true`.

Must connect to:
- `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`
- existing `trpc.finance.receiveStudentPayment`

Validation:
- User can start from sidebar and collect a student payment without hunting through overview cards.

### 3. `/finance/students` - Student Balances
Purpose:
- Student receivables and balances, not generic "student fees".

Content:
- students with total due, total paid, pending, current term, class
- filters by class, term, balance status
- action: Receive payment
- action: Open student finance tab

Likely current source:
- `/finance/student-fees`
- `FinanceChargesPage` with student-related filters
- tables under `components/tables/student-fees`

Validation:
- Page language should say "balances", "outstanding", "student account", not just "fees".

### 4. `/finance/collections` - Collections
Purpose:
- Reporting-oriented view of money collected from students.

Content:
- collection summary by class/term/date
- payment method breakdown
- recent receipts
- export CSV/PDF

Validation:
- This should not be where users configure fees.

### 5. `/finance/payments` - Receipts & Payments
Purpose:
- Historical list of payment records and receipts.

Content:
- student payments
- service/staff payments if product wants a unified payment ledger
- receipt actions
- cancel/reverse where allowed

Decision point:
- If this page mixes incoming and outgoing payments, label it "Receipts & Payments".
- If only incoming student payments, label it "Student Receipts".

### 6. `/finance/payables` - Payables
Purpose:
- Actual school obligations to pay.

Tabs:
- All Payables
- Payroll Bills
- Service Bills
- Owing & Repayments

Future status-filter tabs can add:
- Pending
- Paid
- Cancelled

Content:
- payable amount
- funded amount
- owing amount
- stream/account
- due date
- status
- pay/cancel/repay actions

Likely current source:
- `/finance/bills`
- `FinanceChargesPage`
- `finance.getCharges`
- stream funding docs

Validation:
- User should understand "this is what the school owes or has paid out."

### 7. `/finance/payables/payroll` - Payroll Bills
Purpose:
- Staff remuneration/payroll payable workspace.

Label correction:
- Current "Staff Remuneration" appears to link to `/finance/payments`, which is confusing. It should be under Pay Money, not alongside general incoming payments.

### 8. `/finance/payables/services` - Service Bills
Purpose:
- Actual service/vendor bills owed by school.

Do not confuse with:
- Service Billables, which are reusable definitions/setup.

### 9. `/finance/payables/owing` - Owing & Repayments
Purpose:
- Settlement-backed owing created when payables exceed stream funds.

Relevant docs:
- `brain/features/stream-funding.md`

### 10. `/finance/accounts` - Accounts
Purpose:
- Account balances, available funds, projected balances.

Current source:
- `/finance/streams`
- `FinanceOverview`
- stream table
- `FinanceStreamDetail`

Content:
- available balance
- projected balance
- pending payables
- outstanding owing
- active billables
- action: transfer
- action: fund stream/account

### 11. `/finance/accounts/transfers` - Transfers
Purpose:
- Internal transfers between streams/accounts.

Current source:
- `/finance/internal-transfers`
- `FinanceTransfersPage`

### 12. `/finance/ledger` - Ledger
Purpose:
- Immutable financial movement history.

Current source:
- `/finance/transactions`
- `FinanceTransactionsPage`
- `finance.getLedgerEntries`

Use "Ledger" not "Transactions" in nav if possible, because it carries stronger accounting meaning.

### 13. `/finance/setup/fees` - Fee Structures
Purpose:
- Define student/term/class fee structures.

Current source:
- `/finance/fees-management`
- `FinanceItemsPage` with fee-oriented filter, or existing fee management table if present.

Must make clear:
- These are student charges.
- They can be scoped to term/class.
- They connect to Receive Student Payment.

Primary actions:
- Create Fee Structure
- Import Previous Term Fees
- Apply Fee to Eligible Students

### 14. `/finance/setup/service-billables` - Service Billables
Purpose:
- Define reusable non-student billable/service/expense items.

Current source:
- `/finance/billables`
- `FinanceItemsPage`

Must make clear:
- These are definitions/templates for school-side bills, not student fees.
- Creating a service billable is not the same as creating an actual payable.

Primary actions:
- Create Service Billable
- Generate Payables from Billables if supported

### 15. `/finance/setup/items` - Finance Items
Purpose:
- Optional advanced/admin setup surface if the app needs a generic item list.

Decision point:
- Hide this for normal users unless there is a clear job. Generic "Finance Items" may recreate the current confusion.

### 16. `/finance/reconciliation` - Reconciliation
Purpose:
- Trust layer: mismatches, reports, exports, maintenance actions.

Current source:
- `FinanceReconciliationPage`
- `FinanceReconciliationView`
- `finance.getFinanceIntegrityReport`
- `finance.getFinanceReports`

Keep this first-class in nav.

## Detailed Implementation Phases

### Phase Progress Audit
- Phase 0 is partially done: key files and docs have been identified, but runtime sidebar ownership still needs confirmation in-app.
- Phase 1 is mostly implemented in the current worktree: both observed navigation sources use Account & Finance grouping, canonical route names, and direct Pay Money links for Payables, Payroll Bills, Service Bills, and Owing & Repayments.
- Phase 2 is mostly implemented: canonical route wrappers and major old-route redirects exist, deprecated hardcoded finance URL scan is clean, and redirect pages now preserve query params statically. Remaining work is runtime redirect behavior verification.
- Phase 3 is partially implemented through wrapper page titles/subtitles, explicit header actions, workflow-specific table copy, first-pass empty-state text/actions, account-oriented visible table columns, Service Bills/Payroll filter fixes, charge-row payment actions, and a service-only creator on Service Billables. Deeper workflow-specific actions still need true workflow-specific UX.
- Phase 4 is partially implemented: Overview now has a command-center layout with real stream-derived finance metrics, but runtime/design verification and richer data-backed attention counts remain.
- Phase 5 is partially implemented: Payables routes and tabs exist, but data semantics, labels, and status filters need verification.
- Phase 6 is partially implemented: `/finance/receive` exists, sidebar exposure is present, and its table copy now speaks in payment-queue language. The page still needs runtime receive-payment workflow verification.
- Phase 7 is partially implemented for page/table copy, empty-state text, search catalog aliases, static breadcrumb audit, and row-action copy. Runtime copy review remains.
- Phase 8 is not complete: runtime navigation, old URLs, permissions, mobile, and workflow checks remain.

### Phase 0 - Safety And Orientation
Goal:
- Establish current state and prevent accidental loss of existing work.

Steps:
1. Run `git status --short`.
2. Read this handoff.
3. Read the four brain docs listed above.
4. Inspect:
   - `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts`
   - `apps/dashboard/src/sidebar/utils.ts`
   - `packages/navigation/src/types.ts`
   - `packages/navigation/src/sidebar.ts`
   - `apps/dashboard/src/features/navigation/sidebar-modules.ts`
5. Determine which sidebar source is active in the running product.
6. Do not start by deleting routes.

Validation:
- Agent can explain current finance nav sources and route/page ownership.

### Phase 1 - Navigation Label And Grouping Cleanup
Goal:
- Improve navigation immediately without route churn.

Current status:
- Mostly implemented in `dashboard-nav-registry.ts` and `sidebar/utils.ts`.
- Do not blindly repeat this phase. Audit and refine instead.

Steps:
1. In the active navigation registry/sidebar, group finance links by workflow:
   - Overview
   - Receive Money
   - Pay Money
   - Accounts
   - Setup
   - Reconciliation
2. Rename labels while keeping existing hrefs:
   - Dashboard -> Overview
   - Student Accounts -> Student Balances
   - Fee Structures -> Fee Structures
   - Service Billables -> Service Billables
   - General Collections -> Collections
   - Bills & Expenses -> Payables
   - Staff Remuneration -> Payroll Bills
   - Transactions -> Ledger
   - Account Streams -> Accounts
   - Internal Transfers -> Transfers
   - Reconciliation -> Reconciliation
3. Ensure roles/access remain unchanged.
4. Update search catalog keywords if finance links are indexed in:
   - `apps/dashboard/src/components/search/search-catalog.ts`
5. Keep route paths stable in this phase.

Validation:
- Sidebar shows logical groups.
- Existing links still navigate.
- No route/file moves yet.
- Current gap: verify Receive Student Payment is visible in the running sidebar for Admin and Accountant.

### Phase 2 - Canonical Routes And Redirects
Goal:
- Introduce route names that match the new IA while preserving old URLs.

Current status:
- Partially implemented. Canonical route files exist for the main route map, and key old routes redirect.
- Remaining work is route/link audit, not first-time creation of every route.

Steps:
1. Create canonical route folders:
   - `finance/receive`
   - `finance/students`
   - `finance/payables`
   - `finance/payables/payroll`
   - `finance/payables/services`
   - `finance/payables/owing`
   - `finance/accounts`
   - `finance/accounts/transfers`
   - `finance/ledger`
   - `finance/setup/fees`
   - `finance/setup/service-billables`
   - `finance/setup/items` only if needed
   - `finance/reports` only if separate from reconciliation
2. Initially, make canonical routes render existing page components.
3. Add redirects from old routes using Next.js redirect helpers in old `page.tsx` files, or keep old pages as thin wrappers during transition.
4. Update sidebar hrefs to canonical routes only after redirects exist.
5. Update internal links:
   - stream detail back links
   - quick action links
   - table row actions
   - dashboard CTA links

Decision point:
- If time is limited, only create canonical wrappers for the highest-confusion pages:
  - `/finance/setup/fees`
  - `/finance/setup/service-billables`
  - `/finance/payables`
  - `/finance/accounts`
  - `/finance/ledger`

Validation:
- Old URLs still work.
- New URLs work.
- Sidebar uses new URLs.

### Phase 3 - Workspace Page Restructuring
Goal:
- Make each page look like a finance workflow, not a raw table.

Steps:
1. Add/standardize page shells:
   - title
   - short subtitle
   - primary action
   - summary cards
   - tabs/filters
   - data table
   - empty state
2. For `Fee Structures`:
   - title: "Fee Structures"
   - subtitle: "Configure student fees by term, stream, and classroom."
   - primary action: "Create Fee Structure"
   - secondary action: "Import Previous Term Fees"
3. For `Service Billables`:
   - title: "Service Billables"
   - subtitle: "Set up reusable school-side service and expense items."
   - primary action: "Create Service Billable"
   - secondary action if supported: "Generate Payables"
4. For `Payables`:
   - title: "Payables"
   - subtitle: "Track school obligations, payments, and owing."
   - tabs: All Payables, Payroll Bills, Service Bills, Owing & Repayments
   - primary action: "Create Payable"
5. For `Accounts`:
   - title: "Accounts"
   - subtitle: "Monitor available funds, projected balances, and account activity."
   - primary action: "Create Account"
   - secondary action: "Transfer Funds"
6. For `Ledger`:
   - title: "Ledger"
   - subtitle: "Review immutable finance movements across accounts."
7. For `Reconciliation`:
   - title: "Reconciliation"
   - subtitle: "Resolve integrity issues and export trusted reports."

Validation:
- Each page has one obvious primary job.
- Fees and billables have visibly different descriptions and actions.

### Phase 4 - Overview Rebuild
Goal:
- Make `/finance` a command center.

Steps:
1. Audit `FinanceOverview`, `FinanceOverviewStats`, and `FinanceQuickActions`.
2. Replace generic cards with grouped operational sections:
   - Money In
   - Money Out
   - Accounts
   - Reconciliation
3. Add primary actions:
   - Receive Student Payment
   - Create Fee Structure
   - Review Payables, or Create Service Bill once a dedicated create-bill action exists
   - Transfer Funds
4. Add attention cards:
   - overdue student balances
   - pending payables
   - streams with negative projected balance
   - reconciliation issues
5. Keep stream table, but position it as "Account Health" rather than the whole dashboard.

Validation:
- Finance admin can identify urgent work without opening five separate pages.

### Phase 5 - Consolidate Payables
Goal:
- Stop scattering outgoing-money workflows.

Steps:
1. Audit current `/finance/bills`, `/finance/payments`, payroll/service bill pages, and filters.
2. Decide exact filters for:
   - payroll payables
   - service payables
   - paid payables
   - owing payables
3. Create a unified `Payables` workspace that can filter by type/status.
4. Keep subroutes for deep links if helpful:
   - `/finance/payables/payroll`
   - `/finance/payables/services`
   - `/finance/payables/owing`
5. Make old labels disappear from sidebar:
   - no top-level "Bills & Expenses"
   - no confusing "Staff Remuneration" under general finance

Validation:
- A user looking to pay staff/service bills goes to Pay Money -> Payables.

### Phase 6 - Receive Money Flow Cleanup
Goal:
- Make incoming-money flows obvious.

Steps:
1. Verify the sidebar/page entry for "Receive Student Payment" renders for Admin and Accountant.
2. Ensure Receive Payment can be started from:
   - Overview quick action
   - Student Balances row action
   - `/finance/receive`
3. Ensure `Fee Structures` links to Receive Payment only when the user is collecting, not configuring.
4. Keep Collections and Receipts separate:
   - Collections = reporting/summary
   - Receipts & Payments = transaction history

Validation:
- User can answer: "Where do I collect a payment?" immediately.

### Phase 7 - Search, Breadcrumbs, Empty States, And Copy
Goal:
- Polish discoverability.

Steps:
1. Update search catalog entries:
   - receive payment
   - student balances
   - fee structures
   - service billables
   - payables
   - ledger
   - streams/accounts
   - reconciliation
2. Add breadcrumbs where route depth increases:
   - Accounts & Finance > Setup > Fee Structures
   - Accounts & Finance > Pay Money > Payables
3. Rewrite empty states:
   - Fees: "Create your first student fee structure."
   - Service Billables: "Create reusable service or expense items for school-side bills."
   - Payables: "Create or generate payables to track obligations."
4. Ensure button labels are command-oriented:
   - Create Fee Structure
   - Create Service Billable
   - Receive Payment
   - Transfer Funds
   - Run Reconciliation

Validation:
- No generic empty states like "No data found" on primary finance pages.

### Phase 8 - Verification And Documentation
Goal:
- Prove that navigation is coherent and old links are safe.

Manual checks:
1. Navigate every Account & Finance sidebar link.
2. Navigate every old finance URL and confirm redirect/wrapper behavior.
3. Confirm role/access behavior did not widen permissions.
4. Confirm search opens the expected pages.
5. Confirm Receive Payment still works.
6. Confirm Fee Structures and Service Billables are visually and semantically distinct.
7. Confirm mobile sidebar and finance pages remain usable.

Suggested docs updates:
- Update `brain/features/finance-operations.md` with final route map.
- Update `brain/features/student-fees.md` if Fee Structures route changes.
- Update `brain/PROJECT_INDEX.md` if finance route map is materially changed.
- Consider ADR addendum if navigation registry ownership changes.

## Suggested Data/UI Mapping

| User Job | UI Label | Old Route | New Route | Likely Component |
|---|---|---|---|---|
| Finance command center | Overview | `/finance` | `/finance` | `FinancePage`, `FinanceOverview` |
| Collect student payment | Receive Student Payment | sheet/action only | `/finance/receive` | `ReceivePaymentSheet` |
| See student receivables | Student Balances | `/finance/student-fees` | `/finance/students` | `FinanceChargesPage` or student fees table |
| Report collections | Collections | `/finance/collections` | `/finance/collections` | `FinanceChargesPage` |
| View payment history | Receipts & Payments | `/finance/payments` | Not currently exposed | Reintroduce after defining student receipts versus all payment history. |
| Pay school obligations | Payables | `/finance/bills` | `/finance/payables` | `FinanceChargesPage` |
| Manage finance accounts | Accounts | `/finance/streams` | `/finance/accounts` | `FinancePage`, account table |
| Move funds internally | Transfers | `/finance/internal-transfers` | `/finance/accounts/transfers` | `FinanceTransfersPage` |
| Review ledger movement | Ledger | `/finance/transactions` | `/finance/ledger` | `FinanceTransactionsPage` |
| Configure student fees | Fee Structures | `/finance/fees-management` | `/finance/setup/fees` | `FinanceItemsPage` or dedicated fee page |
| Configure service items | Service Billables | `/finance/billables` | `/finance/setup/service-billables` | `FinanceItemsPage` |
| Validate finance data | Reconciliation | `/finance/reconciliation` | `/finance/reconciliation` | `FinanceReconciliationPage` |

## Data And Query Contract Map
Use existing read models first. Only add API shape when the current query cannot support the workflow.

| UI Area | Primary data/query source | Required fields or behavior | Notes |
|---|---|---|---|
| Overview / Account Health | `trpc.finance.overview` | account balances, available balance, projected balance, pending bills, owing, active billables | Reframe existing stream-backed data as account health. |
| Receive Student Payment | `trpc.finance.searchStudentsForPayment`, `trpc.finance.getReceivePaymentData`, `trpc.finance.receiveStudentPayment` | student search, current term, payable rows, stream allocations, receipt payment IDs | `/finance/receive` should launch or embed this flow. |
| Student Balances | `trpc.finance.getCharges` with `payerType: "STUDENT"` or dedicated student balance read model | total due, paid, pending, student/class/term, row action to receive payment | Existing wrapper uses `FinanceChargesPage`; verify table columns are student-friendly. |
| Collections | `trpc.finance.getCharges` / collection summary query | collected totals by date/class/method, export rows | Avoid mixing setup/config actions here. |
| Receipts & Payments | `trpc.finance.getPayments` | payment status, payer, amount, method, reference, receipt actions | Not currently exposed in sidebar; decide whether outgoing payroll/service payments share this page before restoring it. |
| Payables | `trpc.finance.getCharges` with school/staff payer and item-type filters | amount, funded, owing, account, status, due date, pay/cancel/repay actions | Current canonical Payables, Service Bills, Owing, and Payroll Bills pages use `FinanceChargesPage`; Service Bills relies on `type: "SERVICE"`. |
| Accounts | `trpc.finance.overview`, `trpc.finance.getStreamDetails` | available funds, projected balance, pending payables, owing, active billables | Preserve account detail route behavior while internal stream IDs remain unchanged. |
| Transfers | `trpc.finance.getInternalTransfers`, `trpc.finance.transferFunds` | source, destination, amount, note, approval threshold behavior | Large transfer governance must remain server-enforced. |
| Ledger | `trpc.finance.getLedgerEntries` | immutable debit/credit movements, source references, date, stream/account | Do not relabel mutable operational tables as ledger. |
| Fee Structures | `trpc.finance.getItems` or student-fee-specific transaction queries | title, amount, stream, term, classroom scope, apply/import actions | Confirm whether finance items or legacy fee histories are authoritative before deeper rebuild. |
| Service Billables | `trpc.finance.getItems` with `type: "SERVICE"` | reusable service item definitions, charges count, active status | Must not imply these are student fees. |
| Reconciliation | `trpc.finance.getFinanceIntegrityReport`, `trpc.finance.getFinanceReports` | integrity checks, exportable report rows, maintenance actions | Action-level authorization matters here. |

## Implementation Standards

### Frontend/UI Standards
- Do not make a marketing-style finance page.
- Keep pages dense, operational, and scan-friendly.
- Use cards only for repeated records, stat cards, modals, or framed tools.
- Avoid nested cards.
- Use clear buttons with icons for actions.
- Keep mobile layouts responsive:
  - stacked controls
  - full-width buttons on small screens
  - tables either horizontal-scroll cleanly or become card rows
- Use existing shadcn/UI primitives and local table patterns.

### Navigation Standards
- Preserve role access rules.
- Do not duplicate finance links across multiple registries without understanding the adapter.
- Prefer the shared navigation registry long-term, per ADR-0004.
- Keep old URLs reachable until user approves removal.

### Language Standards
Use:
- Accounts & Finance
- Overview
- Receive Money
- Pay Money
- Student Balances
- Fee Structures
- Service Billables
- Payables
- Accounts
- Ledger
- Reconciliation

Avoid in user-facing navigation:
- raw model names
- vague "Bills & Expenses" if it mixes setup and actual payables
- "Transactions" when the accounting concept is ledger
- using "Billables" for student fees

## Important Risks

### Risk: Breaking Existing Routes
Mitigation:
- Add canonical routes first.
- Keep old routes as redirects/wrappers.
- Update sidebar only after new routes work.

### Risk: Confusing Fees And Billables Again
Mitigation:
- Put both under Setup but with separate descriptions and primary actions.
- Fee Structures = student money in.
- Service Billables = school-side expense definitions.

### Risk: Sidebar Gets Too Deep
Mitigation:
- Use grouped sections but keep only one or two levels visible.
- Put secondary pages behind tabs inside workspace pages where possible.

### Risk: Current Dirty Worktree Gets Overwritten
Mitigation:
- Inspect diffs before editing touched files.
- Avoid broad formatting.
- Use scoped patches.

### Risk: Backend/API Does Not Match Desired Workspace Filters
Mitigation:
- Start with UI grouping and existing filters.
- Only add API filters when a page genuinely needs them.
- Keep API changes narrowly scoped.

## Suggested Skills For Next Agent
- `fast-bun-monorepo-command-discipline`: This is a Bun monorepo; avoid broad builds/typechecks by default.
- `plan`: Use if the next agent wants to convert this handoff into a smaller implementation checklist.
- `web-design-guidelines` or `design-review`: Use after UI changes to check visual structure and mobile behavior.
- `review`: Use before landing to inspect route/nav regressions.

## First Concrete Next Steps
1. Run `git status --short`.
2. Confirm the active sidebar source in the running app, because both observed navigation sources are now aligned but runtime ownership still matters.
3. Verify Receive Student Payment appears under Receive Money for Admin and Accountant.
4. Verify old-route redirects at runtime, including any route with query params.
5. Spot-check table actions/quick actions in the browser to confirm they navigate to canonical routes.
6. Continue Phase 3 page-workspace cleanup by reviewing workflow-specific columns, filters, row actions, and empty-state actions for Fee Structures, Service Billables, Payables, Student Balances, and Receive Student Payment.
7. Update search catalog entries and breadcrumbs after route labels settle.

## Definition Of Done
The rebuild is done when:
- Account & Finance sidebar is grouped by workflow.
- Fees and Service Billables are unmistakably distinct.
- Old finance URLs still work or redirect safely.
- Canonical route map is implemented or explicitly deferred.
- Overview functions as a command center.
- Receive Money, Pay Money, Accounts, Setup, and Reconciliation are clear.
- Mobile layouts remain usable.
- Brain docs are updated with final route map and product terminology.
