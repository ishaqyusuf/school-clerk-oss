# Assessment Recording Missing DeptId Metadata Crash

## Date

2026-06-19

## Symptom

Opening the bare `/assessment-recording` dashboard route rendered the dashboard error fallback instead of the assessment context selector. The technical detail showed a Prisma `classRoomDepartment.findUnique()` call with `where.id` set to `undefined`.

## Root Cause

The route metadata generator always queried `classRoomDepartment.findUnique()` with `searchParams.deptId`, even when the route was opened without a selected classroom. That server-side metadata failure happened before the client assessment recording fallback could render.

## Resolution

The metadata generator now returns generic assessment-recording metadata when `deptId` is missing and only includes the nested subject filter when `deptSubjectId` is present.

## Verification

- `bun build 'apps/dashboard/src/app/[domain]/(sidebar)/(student-result-portal)/assessment-recording/page.tsx' --target=node --outdir=/private/tmp/assessment-recording-page-check '--external=@/*' '--external=@school-clerk/*' '--external=next/*' '--external=react'`
- In-app browser reload of `http://daarulhadith.localhost:2200/assessment-recording` shows the “Select assessment context” fallback with no captured warning or error logs.
