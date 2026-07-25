# Bug: Same-Session Term Setup Blocked By Legacy Classroom References

## Date

2026-07-21

## Problem

The same-session term rollover preview reported that selected subjects required unmapped classrooms, even though the page correctly stated that classrooms would be reused. The blocker disabled `Apply rollover` for the Daarul Hadith second-term draft.

## Root Cause

The source term contained valid academic records whose classroom-department foreign keys still referenced a structurally equivalent older session. Rollover built its classroom maps only from classrooms directly owned by the source term's session, so those legacy dependency IDs were absent even though every referenced classroom and department had a name-matched canonical record in the target session.

## Fix

Collect classroom dependencies from subjects, student term forms, teacher classroom assignments, and academic access grants. Resolve all referenced classrooms and departments by normalized names against the target session structure, preserve direct identity mapping for canonical same-session records, and rebuild aliases after creating cross-session classrooms.

## Prevention

Keep the regression test that models a source subject tied to an older-session classroom department and asserts that preview succeeds and apply writes the target subject against the current session department. When adding rollover dependencies, include their classroom relations in the shared referenced-structure collector rather than assuming every foreign key belongs to `source.session.classRooms`.

## Related Files

- `apps/api/src/db/queries/academic-term-setup.ts`
- `apps/api/src/db/queries/academic-term-setup.test.ts`
- `.brain/features/academic-term-lifecycle-and-rollover.md`
