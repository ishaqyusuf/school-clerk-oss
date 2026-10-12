# Attendance draft lost when adding a student

- Reported: 2026-10-12
- Status: Fixed locally, production rollout pending

## Root cause

Mobile Sheet.PrimaryContent returns null while secondary registration is open;
MultiSheetContent also changes its wrapper tree. The recorder is unmounted and
its local state resets before registration can refresh the roster.

## Repair

Parent-owned, identity-scoped AttendanceDraftProvider retains the draft through
child unmounts. Context-backed recorder mounts skip initial draft resets.
Preserved previous-roster keys ensure newly added students are rendered even
beyond the first 25 rows. Successful attendance saves still clear marks.

## Regression

`bunx --no-install playwright test tests/attendance-draft.spec.ts --workers=1
--reporter=line` passes mobile/desktop actual-component fixtures with synthetic
RPC. Tests cover Cancel, registration refresh, date/subject/details, remarks,
marks, added-student visibility, partial submission, save reset, class/term
change and close/reopen. No real student or attendance records are changed.
