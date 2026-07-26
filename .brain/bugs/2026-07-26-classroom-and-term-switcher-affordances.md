# Classroom And Term Switcher Affordances

## Status

Resolved on 2026-07-26.

## Symptom

- The classroom overview title behaved as a classroom selector but did not show a chevron, so its switching behavior was not visually apparent.
- The administrator header term control did not consistently show the academic session beside the term and only offered terms from the current session.

## Root Cause

The classroom title consumed the shared select trigger without a School Clerk-specific affordance. The shared shadcn-derived trigger's existing icon flags did not provide the required classroom presentation, and project standards prohibit changing that source component directly.

The header switcher derived its menu from only the selected session and hid the session name at most widths.

## Resolution

- Added a project-specific classroom select trigger that suppresses the shared trigger icon path and renders an explicit chevron beside the classroom value.
- Updated the administrator header trigger to show session and term together with its own chevron.
- Grouped scheduled terms across every academic session for administrators. Other roles retain the existing current-session scope.
- Added a strict term-switcher view model that rejects incomplete session data instead of silently dropping malformed records.

## Verification

- Focused classroom-trigger and term-switcher model tests pass.
- Dashboard typecheck passes.
- Authenticated browser QA confirmed the classroom chevron and classroom list, plus the administrator session/term label, chevron, and multi-session term groups.

## Related Files

- `apps/dashboard/src/components/classroom-select-trigger.tsx`
- `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx`
- `apps/dashboard/src/components/sidebar/term-switcher.tsx`
- `apps/dashboard/src/components/sidebar/term-switcher-model.ts`
- `.brain/features/attendance.md`
- `.brain/features/academic-term-lifecycle-and-rollover.md`
