# Bug: Student Import Verification Render Loop

## Date

2026-06-13

## Problem

Submitting the student import form could trigger React's maximum update depth warning in the import review step, with the stack pointing at the target classroom select trigger.

## Root Cause

`ImportActivity` used `verificationReport?.results || []` for the reviewed rows. While verification was still loading, that expression created a new empty array on every render. The default-decision effect depended on that array and reset React state each time, causing a nested update loop.

The select trigger appeared in the stack because it was rendered during the loop; it was not the state source.

## Fix

Use a stable empty rows constant while verification data is missing, and reset row decisions only after `verifyStudentImport` has returned a concrete `results` array. Also removed an unused `value` prop from the select trigger.

## Prevention

Avoid inline `[]` or `{}` fallbacks when the fallback is used in hook dependencies. Prefer module-level empty constants or memoized fallbacks, and gate reset effects until the query result they derive from exists.

## Related Files

- `apps/dashboard/src/components/modals/student-import/import-activities.tsx`

## Related Tests

- `bun --filter @school-clerk/dashboard typecheck` currently fails on unrelated existing repo-wide TypeScript errors.
- Filtered typecheck output for `student-import` / `import-activities` returned no matching errors.
