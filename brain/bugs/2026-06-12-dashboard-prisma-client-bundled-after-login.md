# Dashboard Prisma Client Bundled After Login

## Bug ID and Title
- Date discovered: 2026-06-12
- Date resolved: 2026-06-12
- Severity: High

## Symptoms
After dashboard login, the browser raised `PrismaClient is unable to run in this browser environment` with the stack pointing at `packages/db/src/prisma.ts`.

## Root Cause
Dashboard client components imported helpers and schemas from `apps/api/src/db/queries/*`. Those query modules are server/database modules, so importing even a pure schema could pull API query code and ultimately Prisma into a browser bundle.

## Fix Implemented
Moved browser-safe assessment/report/form schemas and helpers into `@school-clerk/assessment-results`, updated API query modules to import and re-export those shared values, and changed dashboard client imports to use the shared client-safe package. Legacy temp-page imports from API query files were converted to type-only imports.

## Prevention
Do not import API query modules or `@school-clerk/db` from dashboard client components. Shared schemas and pure helpers used by both client and server should live in a client-safe package with no Prisma/server dependencies.

## Related Files
- `packages/assessment-results/src/index.ts`
- `apps/dashboard/src/components/subject-assessments.tsx`
- `apps/dashboard/src/components/forms/assessment-form.tsx`
- `apps/dashboard/src/components/asessment-submissions.tsx`
- `apps/dashboard/src/features/student-report/report-model.ts`
- `apps/api/src/db/queries/assessments.ts`
- `apps/api/src/db/queries/first-term-data.ts`
- `apps/api/src/db/queries/subjects.ts`
- `apps/api/src/db/queries/enrollment-query.ts`

## Related Tests
- `bun --cwd packages/assessment-results typecheck` passed.
- `bun --cwd apps/api typecheck` and `bun --cwd apps/dashboard typecheck` still fail on broader pre-existing type errors outside the Prisma bundling fix.
