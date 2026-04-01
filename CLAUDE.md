# School Clerk OSS — Claude Brain

## Project Overview
Open-source multi-tenant school management SaaS. Built as a Turbo monorepo with Bun.

## Monorepo Structure
```
apps/
  api/          # Hono + tRPC backend
  dashboard/    # Next.js admin dashboard (main app)
  web/          # Next.js marketing site
packages/
  auth/         # Better Auth configuration
  db/           # Prisma + PostgreSQL schema
  email/        # React Email templates
  jobs/         # Trigger.dev background jobs
  pdf/          # PDF generation
  site-nav/     # Sidebar/nav components
  ui/           # Shared shadcn/Radix/Tailwind component library
  utils/        # Shared utilities
```

## Tech Stack
- **Frontend**: Next.js 16, React 19, TailwindCSS 4, shadcn/ui (via `@school-clerk/ui`)
- **Backend**: Hono, tRPC (type-safe API)
- **DB**: PostgreSQL + Prisma ORM
- **Auth**: Better Auth with Prisma adapter (cookie-based, domain-scoped)
- **Package manager**: Bun (workspace:*)
- **Monorepo**: Turborepo

## Key Patterns

### Authentication
- `getAuthCookie()` — `apps/dashboard/src/actions/cookies/auth-cookie.ts`
- Returns `{ schoolId, sessionId, termId, sessionTitle, termTitle, domain, auth: { userId, bearerToken } }`
- Multi-tenant: each school has its own subdomain, cookie is scoped to domain

### Server Actions
- All in `apps/dashboard/src/actions/`
- Use `prisma` from `@school-clerk/db` directly
- Always call `getAuthCookie()` to scope queries to the current school/session/term

### tRPC
- API routers: `apps/api/src/trpc/routers/`
- Dashboard client: `apps/dashboard/src/trpc/`
- Server prefetch: `batchPrefetch([trpc.router.procedure.queryOptions({})])`
- Client queries: `useQuery(_trpc.router.procedure.queryOptions({}))`

### UI Components
- All from `@school-clerk/ui` — import path: `@school-clerk/ui/[component]`
- Examples: `@school-clerk/ui/button`, `@school-clerk/ui/card`, `@school-clerk/ui/badge`
- Custom: `@school-clerk/ui/custom/page-title`, `@school-clerk/ui/custom/icons`
- Styles: import `@school-clerk/ui/globals.css` (OKLCH color tokens)
- `transpilePackages: ["@school-clerk/ui"]` required in next.config.ts

### Dashboard Page Pattern
```tsx
// Server component page
import { getAuthCookie } from "@/actions/cookies/auth-cookie"
import { batchPrefetch, trpc } from "@/trpc/server"
import { Suspense } from "react"
import { ErrorBoundary } from "next/dist/client/components/error-boundary"
import { ErrorFallback } from "@/components/error-fallback"
import { PageTitle } from "@school-clerk/ui/custom/page-title"

export default async function Page({ searchParams }) {
  batchPrefetch([trpc.router.procedure.queryOptions({})])
  return (
    <div>
      <PageTitle>Page Name</PageTitle>
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<TableSkeleton />}>
          <DataTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
```

### Prisma Models (key ones)
- `prisma.schoolProfile` — school tenant (has `id`, `name`, `subDomain`, `slug`)
- `prisma.tenantDomain` — domain record per school (`subdomain`, `customDomain`, `isPrimary`, `isVerified`). Linked to both `SchoolProfile` and `SaasAccount`
- `prisma.students` — students (linked via `sessionForms`)
- `prisma.staffProfile` — staff members
- `prisma.classRoomDepartment` — classes (linked to `classRoom.schoolSessionId`)
- `prisma.sessionTerm` — academic terms (has `schoolId`, `sessionId`)
- `prisma.walletTransactions` — finance transactions

### Multi-Tenant Domain Architecture
See `brain/decisions/ADR-0003-tenant-domain-model.md` for full rationale.
- `TenantDomain` model: `subdomain` (slug only) + `customDomain` (full, nullable) — linked to both `SchoolProfile` + `SaasAccount`
- Dashboard URL auto-derived by middleware (`dashboard.{subdomain}.school-clerk.com`) — never stored in DB
- Signup: `create-saas-profile.ts` creates `TenantDomain` in step 2 of `$transaction` + calls `addDomainToVercel()` post-tx (production-only)
- `SchoolProfile.subDomain` stays as the fast-lookup middleware field
- **Canonical slug resolution** (both `proxy.ts` + `auth-cookie.ts`): `extractTenantSubdomain` → `stripDashboardPrefix` → custom domain DB fallback. Shared helper in `apps/dashboard/src/utils/tenant-host.ts`

## Dashboard App Structure

### Route Groups
- `(sidebar)/` — authenticated pages with sidebar nav (checks `schoolId` in cookie)
- `(auth)/` — login, forgot-password, reset-password, signout
- `(public)/` — no auth: assessment-recording, result, student-report
- `(temp)/` — temporary/hardcoded dev pages, ignore for MVP
- `onboarding/` — create-school, create-academic-session

### Sidebar Nav Modules (from `src/components/sidebar/links.ts`)
| Module | Key Routes |
|--------|-----------|
| Community | `/dashboard`, `/announcements`, `/calendar` |
| HRM | `/staff/teachers`, `/staff/non-teaching`, `/staff/departments`, `/staff/attendance`, `/staff/payroll` |
| Bursary | `/finance`, `/finance/fees-management`, `/finance/billables`, `/finance/transactions`, `/finance/student-fees`, `/finance/bills`, `/finance/payments` |
| Academic | `/academic`, `/students/list`, `/students/enrollment`, `/academic/classes`, `/academic/subjects`, `/academic/assessments`, `/academic/grading`, `/academic/reports` |
| PTA | `/parents/performance`, `/parents/messages`, `/parents/payments` |
| Settings | `/settings/school-profile`, `/settings/sessions`, `/settings/roles` |

### Page Status (as of session)
**Implemented (full data + UI):**
- `/students/list`, `/students/enrollment`
- `/academic` (sessions dashboard), `/academic/classes`, `/academic/subjects`
- `/academic/term-getting-started/[id]`
- `/staff/teachers` (searchable list; safely returns empty state when school/session/term cookie context is missing)
- `/finance`, `/finance/bills`, `/finance/billables`, `/finance/fees-management`, `/finance/student-fees`, `/finance/transactions`
- `/settings/school-profile` (read-only profile card)
- `/dashboard` (home dashboard with stat cards)
- `onboarding/create-school` (confirmation page)
- **Attendance system** (classroom sheet → Attendance tab + Take Attendance secondary panel; student sheet → Attendance tab with history + stats)
- **Finance system** (`/finance/streams` accounting streams + fund transfers; `/finance/payments` service expenses; `/staff/payroll` staff salary bills + payments)
- **Student finance** (enhanced: payment method, purchase recording, payment history, reverse payment)

**Coming Soon stubs (placeholder):**
- `/announcements`, `/calendar`
- `/staff/non-teaching`, `/staff/departments`, `/staff/attendance`, `/staff/payroll`
- `/finance/payments`
- `/academic/assessments`, `/academic/grading`, `/academic/reports`
- `/parents/performance`, `/parents/messages`, `/parents/payments`
- `/settings/sessions`, `/settings/roles`

### Session Roll-over & Student Promotion System
See `brain/features/student-promotion.md` for full details.
- **Entry**: Academic dashboard → "Create New Session" / "Start Roll-over Wizard →" → opens `AcademicSessionSheet`
- **Form prefill**: `academics.getSessionPrefill` → suggests next year title/dates; "Initialize with Terms" toggle auto-populates 3 terms
- **On success**: cookie auto-switches to new session (`switchSessionTerm` server action), then redirects to `/academic/promotion/[lastTermId]/[firstTermId]`
- **Promotion page** (`/academic/promotion/[lastTerm]/[firstTerm]`): student table + filters + batch promote/reverse + per-student performance modal
- **New tRPC procedures** in `academics.routes.ts`: `getSessionPrefill`, `getPromotionStudents`, `getStudentTermPerformance`, `batchPromote`, `reversePromotion`
- **`createAcademicSession`** updated to return `{ sessionId, sessionTitle, terms: [{ id, title }] }`

### Finance System Pattern
- **Accounting Streams**: `Wallet` model — named buckets scoped to term+school. `finance.getStreams` returns balances. `finance.transferFunds` moves money between wallets.
- **Service Payments**: `Bills` where `staffTermProfileId = null`. `finance.createServicePayment` → `finance.payServiceBill` (creates WalletTransaction + BillInvoice + BillPayment).
- **Payroll**: `Bills` where `staffTermProfileId != null`. `finance.createStaffBill` auto-creates `StaffTermProfile`. `finance.payStaffBill` pays salary.
- **Student Payment**: `finance.applyPayment` (payment method in description). `finance.createStudentPurchase` for sales (uniform, books). `finance.reverseStudentPayment` restores `StudentFee.pendingAmount`.
- **Pages**: `/finance/streams`, `/finance/payments` (service), `/staff/payroll`
- **Router file**: `apps/api/src/trpc/routers/finance.routes.ts`
- **Additional procedures**: `getBillables`, `createBillable`, `getBills`, `createBill`, `getTransactions` in finance router

### tRPC Router Coverage (all server actions migrated)
- **`staff.routes.ts`** — `createStaff`, `deleteStaff`, `getStaffList` (NEW)
- **`classroom.routes.ts`** — added `createClassroom`, `deleteClassroomDepartment`
- **`finance.routes.ts`** — added `getBillables`, `createBillable`, `getBills`, `createBill`, `getTransactions`
- **`transaction.routes.ts`** — added `getSchoolFees`, `getStudentFees`
- All forms (classroom-form, staff-form, bill-form, school-fee-form, billable-form) now use `useMutation(trpc.*)` instead of `useAction(serverAction)`
- All table delete actions use `useMutation(trpc.*)` instead of `useAction(serverAction)`
- Finance table indexes (`billables`, `bills`, `fees-management`, `student-fees`, `transactions`) are client components using `useSuspenseQuery(trpc.*)`

### Staff/Teacher Status
- Teachers page search uses `staffPageQuery` and `MiddaySearchFilter` with an explicit filter schema to avoid client-side query-state crashes.
- `getStaffListAction` now returns an empty list when tenant cookie context lacks `schoolId`, `sessionId`, or `termId`, and scopes teacher list queries to the active tenant and active term.
- Teachers can now be created or edited with a role, allowed classrooms, allowed subjects, and an optional onboarding email invite from the dashboard sheets.
- Staff invites create/update the tenant `User` role and trigger Better Auth password setup via the reset-password email flow.
- Classroom permissions are stored on `StaffClassroomDepartmentTermProfiles` for the active term profile; subject permissions are stored on `StaffSubject` against active-term `DepartmentSubject` records.
- The assignment workflow exists now, but downstream teacher-facing modules still need to explicitly enforce these assignments when they add teacher access controls.

### Attendance System Pattern
- **Models**: `ClassRoomAttendance` (session) + `StudentAttendance` (per-student record)
- **tRPC router**: `apps/api/src/trpc/routers/attendance.routes.ts` — `getClassroomAttendance`, `takeAttendance`, `getStudentAttendanceHistory`
- **Classroom sheet**: "Attendance" tab → `ClassroomAttendance` component + "Take Attendance" → secondary panel `ClassroomAttendanceForm` (uses `secondaryTab: "attendance-form"`)
- **Student sheet**: "Attendance" tab → `StudentAttendanceHistory` component (summary stats + record list)
- **Hook**: `useClassroomParams` tabs include `"attendance"`; secondaryTabs include `"attendance-form"`

## Web (Marketing) App — `apps/web`
Fully built marketing landing page with:
- Nav, Hero, Features, Pricing (Free/$29/$49), Testimonials, FAQ, Footer
- Uses `@school-clerk/ui` (transpilePackages configured)
- All sections in `apps/web/src/components/`

## Dev Commands
```bash
bun run dev              # dashboard + api
bun run dev:dashboard    # dashboard only
bun run build:dashboard  # build dashboard
bun run db:push          # sync prisma schema
bun run db:studio        # prisma studio
bun run lint
bun run typecheck
```

## Git
- Active branch: `claude/plan-marketing-app-nEDG0`
- Always push to `claude/` prefixed branches
- Push with: `git push -u origin <branch>`

## Always Do
- Update this file (CLAUDE.md) after every session with new patterns, decisions, or status changes
- Read and update relevant files in the `brain/` folder (decisions, features, tasks, bugs) when working on a feature or making architectural decisions — keep the brain in sync with every session
- Use `@school-clerk/ui` components, never raw HTML for UI
- Use `getAuthCookie()` to scope all DB queries
- Use `batchPrefetch` for tRPC server-side data loading
- Add `PageTitle` to all new pages
- Wrap data components in `<ErrorBoundary>` + `<Suspense>`
