# Verify Student Classroom Filter Contract

Labels: `wayfinder:research`
Status: Open
Blocked by: None
Blocks: `004-design-detection-and-merge-api-contract.md`, `005-design-student-and-classroom-ui-surfaces.md`, `007-build-implementation-handoff.md`

## Question

Why does the student page classroom filter sometimes show no results even when the selected class has students?

## Context

The duplicate-warning feature will rely on trustworthy classroom-scoped student data. If `/students/list` returns the wrong rows for a classroom filter, duplicate counts and merge candidates will also be wrong.

Initial hypothesis from code reading: `students.index` only defaults `sessionId` and `sessionTermId` when the whole query is empty. A classroom-only filter sets `departmentId`, so `query.sessionId` may stay empty while `whereStudents` checks `sessionForms.some.schoolSessionId`.

## Resolve

- Reproduce the classroom filter path from `/students/list` through `useStudentFilterParams`, student `DataTable`, and `trpc.students.index`.
- Confirm whether classroom-only filters omit `sessionId` and cause the API to compare `StudentSessionForm.schoolSessionId` with `undefined`.
- Decide whether student classroom filtering should default the active session and active term even when other filters are present.
- Decide whether filtering should use `StudentTermForm.classroomDepartmentId + sessionTermId`, `StudentSessionForm.classroomDepartmentId + schoolSessionId`, or both.
- Confirm how the fix affects classroom overview Students tab, which passes `departmentId` as a default filter.
- Define regression coverage for a class with students, both with explicit and omitted `sessionId`/`sessionTermId`.

## Expected Answer

A root-cause statement and implementation recommendation for the student list classroom filter, including the exact query contract that duplicate detection should depend on.

## Approved Comment

The student classroom filter should always resolve against the active school session and active term when `sessionId` or `sessionTermId` is not explicitly provided. The likely bug is that a classroom-only filter sends `departmentId` without `sessionId`, while the API filters `StudentSessionForm.schoolSessionId` using an empty value. The fix should default `sessionId` and `sessionTermId` independently, not only when the whole query is empty. Classroom-filtered student lists should prefer current `StudentTermForm.classroomDepartmentId + sessionTermId` for term-accurate results, while still using `StudentSessionForm` as supporting session context where needed.
