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
- `prisma.students` — students (linked via `sessionForms`)
- `prisma.staffProfile` — staff members
- `prisma.classRoomDepartment` — classes (linked to `classRoom.schoolSessionId`)
- `prisma.sessionTerm` — academic terms (has `schoolId`, `sessionId`)
- `prisma.walletTransactions` — finance transactions

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
- `/staff/teachers`
- `/finance`, `/finance/bills`, `/finance/billables`, `/finance/fees-management`, `/finance/student-fees`, `/finance/transactions`
- `/settings/school-profile` (read-only profile card)
- `/dashboard` (home dashboard with stat cards)
- `onboarding/create-school` (confirmation page)

**Coming Soon stubs (placeholder):**
- `/announcements`, `/calendar`
- `/staff/non-teaching`, `/staff/departments`, `/staff/attendance`, `/staff/payroll`
- `/finance/payments`
- `/academic/assessments`, `/academic/grading`, `/academic/reports`
- `/parents/performance`, `/parents/messages`, `/parents/payments`
- `/settings/sessions`, `/settings/roles`

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
- Use `@school-clerk/ui` components, never raw HTML for UI
- Use `getAuthCookie()` to scope all DB queries
- Use `batchPrefetch` for tRPC server-side data loading
- Add `PageTitle` to all new pages
- Wrap data components in `<ErrorBoundary>` + `<Suspense>`
