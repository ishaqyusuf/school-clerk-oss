# Attendance First-Page Roster Save Failure

## Symptom

Classroom attendance appeared not to save for some classes, and the recorder showed only part of the student roster with no way to continue loading students.

## Root Cause

The administrator recorder reused the general `students.index` query as a normal one-page query. That endpoint defaults to 20 records, but attendance creation and correction correctly reject any payload that does not include every active classroom student. Classes with more than 20 students therefore submitted a partial roster and received the full-roster validation rejection. The generic mutation toast obscured the server's actionable error.

## Resolution

Attendance capture now uses a dedicated, authorized `getAttendanceRoster` endpoint that returns the complete active-term classroom roster in one request. The client retains every returned student for marking and submission, progressively renders 25 rows at a time through an intersection sentinel, disables save while roster loading fails or remains pending, and shows the server's mutation message inline. A focused API regression covers a 25-student roster, which is larger than the old default page.

The classroom Attendance surface was also split into `Mark attendance` and `Sessions` sub-tabs so saved history no longer sits below the complete roster.

## Verification

- The new regression failed with `No procedure found on path "getAttendanceRoster"` before the fix and passes after the endpoint was added.
- All 16 focused attendance router tests and two attendance form-schema tests pass.
- Dashboard and database package typechecks pass.
- The broader API typecheck has only pre-existing academic-term reset/setup errors and no attendance errors.
- The dashboard production build compiles successfully before unrelated page-data collection fails on missing `DATABASE_URL` and `BETTER_AUTH_SECRET`.
- Live browser QA was blocked because no School Clerk stack was running and cmux was unavailable; project rules prohibited starting the dev server elsewhere.

## Related Files

- `apps/api/src/trpc/routers/attendance.routes.ts`
- `packages/db/src/attendance.ts`
- `apps/dashboard/src/components/classroom-attendance-form.tsx`
- `apps/dashboard/src/components/classroom-attendance-roster.tsx`
- `apps/dashboard/src/components/classroom-attendance.tsx`
- `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`
- `apps/dashboard/src/lib/attendance.ts`
- `.brain/features/attendance.md`

## Related Tests

- `apps/api/src/trpc/routers/attendance.routes.test.ts`
- `apps/dashboard/src/lib/attendance.test.ts`
