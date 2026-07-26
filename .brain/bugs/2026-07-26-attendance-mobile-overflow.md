# Attendance Mobile Overflow

## Status

Resolved on 2026-07-26.

## Symptom

- The classroom attendance roster kept its three-column desktop table on phones, which pushed student names and remarks outside the visible classroom dialog.
- The sticky date, bulk-action, and save toolbar attempted to keep too many controls on one row, clipping the primary Save attendance action.
- Saved-session and recorded-session tables did not provide a narrow-screen presentation.

## Root Cause

The attendance surfaces relied on desktop table geometry and fixed-width status controls at every breakpoint. The sticky action bar also lacked a mobile layout that allowed controls to wrap into deliberate full-width rows.

## Resolution

- Added mobile student cards with full-label status controls and a full-width remarks field while retaining the compact desktop roster table.
- Stacked date navigation and bulk actions on narrow screens and made Save attendance a full-width primary action.
- Added mobile card presentations for saved sessions and recorded-session student results while preserving desktop tables from the medium breakpoint.
- Added `min-w-0` and scoped overflow containment to the attendance tabs and content surfaces.

## Verification

- Focused attendance tests passed.
- Populated saved-session and recorded-session responsive render fixtures passed; all live classrooms had zero saved sessions, so no temporary school records were created for QA.
- Dashboard typecheck passed.
- Authenticated browser QA passed at 320 × 800, 390 × 844, and 1280 × 900.
- The document and classroom dialog reported matching client and scroll widths at mobile and desktop sizes.
- Status selection and remark entry were exercised on the mobile roster without submitting attendance.

## Related Files

- `apps/dashboard/src/components/classroom-attendance-roster.tsx`
- `apps/dashboard/src/components/classroom-attendance-form.tsx`
- `apps/dashboard/src/components/classroom-attendance.tsx`
- `apps/dashboard/src/components/classroom-attendance-session-lists.tsx`
- `apps/dashboard/src/components/classroom-attendance-session-lists.test.tsx`
- `.brain/features/attendance.md`
