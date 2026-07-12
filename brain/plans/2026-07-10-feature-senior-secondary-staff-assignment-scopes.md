# Spec: Senior Secondary Staff Assignment Scopes

## Problem Statement

Senior secondary schools often organize one class level into departments or arms, for example `SS 1 -> Art`, `SS 1 -> Commercial`, and `SS 1 -> Science`.

Admins need to assign staff and teachers at the level that matches real school work. Today, staff assignment is centered on a specific classroom department plus either selected subjects or all subjects in that department. That works for `SS 1 -> Art -> Mathematics`, but it does not cleanly support broader senior-secondary cases:

- Assign a teacher to all of `SS 1`, with access to Art, Commercial, Science, and every subject under those departments.
- Assign a teacher to `SS 1 -> Mathematics`, with access to Mathematics across every `SS 1` department that offers it.
- Assign a teacher to `SS 1 -> Art`, with access to every subject in Art.
- Assign a teacher to `SS 1 -> Art -> Mathematics`, with access only to Mathematics in the Art department.

Without hierarchy-aware assignment scopes, admins must repeat assignments department by department and subject by subject. That is slow, easy to misconfigure, and likely to miss new department-subject rows added later in the term.

## Solution

Add hierarchy-aware staff academic access grants for class, department, and subject scopes.

From the admin staff invite/edit workflow, admins should be able to assign teaching access at four practical levels:

- Whole class level: selecting `SS 1` grants access to all current and future departments/arms under `SS 1` and all current and future active-term subjects in those departments.
- Department/arm level: selecting `SS 1 -> Art` grants access to all current and future active-term subjects in the Art department only.
- Subject across class level: selecting `SS 1 -> Mathematics` grants access to Mathematics for every current and future `SS 1` department/arm where Mathematics is offered in the active term.
- Subject within department level: selecting `SS 1 -> Art -> Mathematics` grants access only to Mathematics in the Art department.

The implementation should keep the platform's flexible academic hierarchy model. The feature should not hardcode `SS 1`, `Art`, `Commercial`, or `Science`; those are examples of the existing parent `ClassRoom` and child `ClassRoomDepartment` structure.

Effective access should be resolved dynamically anywhere teacher authorization is checked. If a subject is added later under a covered scope, the assigned staff member should receive access without the admin having to recreate the assignment.

## User Stories

1. As a school admin, I want to assign a teacher to an entire class level such as SS 1, so that the teacher can work across every department under that class.
2. As a school admin, I want whole-class assignment to include Art, Commercial, Science, and any other departments under the selected class, so that I do not repeat the same assignment several times.
3. As a school admin, I want whole-class assignment to include all current subjects in every department, so that the teacher can immediately work with the full class level.
4. As a school admin, I want whole-class assignment to include future departments added under the class, so that access stays correct after the academic structure changes.
5. As a school admin, I want whole-class assignment to include future subjects added under covered departments, so that access stays correct after subject setup changes.
6. As a school admin, I want to assign a teacher to one department such as SS 1 -> Art, so that the teacher only sees and works with that department.
7. As a school admin, I want department-level assignment to grant every subject in that department, so that a class teacher or department teacher gets full access for that department.
8. As a school admin, I want department-level assignment to include future subjects added to that department, so that I do not need to update the teacher manually.
9. As a school admin, I want to assign a subject across a class level, such as SS 1 -> Mathematics, so that one Mathematics teacher can work across Art, Commercial, and Science.
10. As a school admin, I want subject-across-class assignment to apply only where the subject is actually offered, so that the system does not create invalid subject access in departments that do not offer the subject.
11. As a school admin, I want subject-across-class assignment to include future department-subject rows for the same subject under that class, so that newly configured departments are covered automatically.
12. As a school admin, I want to assign a subject inside one department, such as SS 1 -> Art -> Mathematics, so that the teacher's access is precise when needed.
13. As a school admin, I want to mix broad and narrow assignments for the same teacher, so that one teacher can own SS 1 Mathematics and also own all subjects in SS 2 Science if needed.
14. As a school admin, I want duplicate or overlapping assignments to be safely deduplicated, so that the teacher does not see duplicate classrooms or subjects.
15. As a school admin, I want the staff form to make the selected scope obvious, so that I can tell whether I am assigning a class, department, subject across class, or subject in department.
16. As a school admin, I want the staff form to prevent invalid combinations, so that I cannot save `SS 1 -> Mathematics` without selecting both a class and a subject.
17. As a school admin, I want the staff form to prevent cross-tenant or cross-session classroom references, so that assignments cannot leak between schools or sessions.
18. As a school admin, I want assignment labels to show full context, so that `Mathematics` in SS 1 is not confused with Mathematics in another class.
19. As a school admin, I want the staff directory to summarize broad assignments clearly, so that I can audit which teachers have broad class access.
20. As a school admin, I want the staff overview to show effective classroom and subject counts, so that broad assignments are reflected in staff workload.
21. As a teacher, I want my workspace to show classrooms from my broad class assignment, so that I can navigate to every department I am responsible for.
22. As a teacher, I want my workspace to show subjects from subject-across-class assignment, so that I can open Mathematics for every allowed department.
23. As a teacher, I want assessment recording to default to one of my allowed class or subject scopes, so that I can begin work without manually fixing inaccessible filters.
24. As a teacher, I want invalid deep links outside my assigned scopes to be blocked or corrected, so that I never accidentally work outside my authorization.
25. As a teacher, I want report sheets to include only the classes, departments, students, subjects, and assessments I am allowed to access, so that my workspace stays focused.
26. As a teacher, I want score-entry permissions to honor broad class and subject assignments, so that I can update scores anywhere my assignment says I should.
27. As a teacher, I want attendance or class-facing lists to honor broad class assignment where those screens already use teacher classroom scope, so that classroom ownership is consistent.
28. As a teacher, I want a subject added later under an assigned broad scope to appear automatically, so that I do not have to ask an admin to update my access.
29. As a teacher, I want a department deleted or removed from a class to disappear from my effective access, so that stale setup does not remain visible.
30. As a teacher, I want soft-deleted assignments, classrooms, departments, or subjects to be ignored, so that removed access is not still usable.
31. As an academic officer, I want teacher authorization rules to be the same across assessment setup, assessment recording, report sheets, and teacher workspace summaries, so that there are no inconsistent access gaps.
32. As an academic officer, I want broad access grants to remain term/session aware, so that a teacher's assignment for one term does not automatically grant another term unless explicitly configured.
33. As an academic officer, I want the system to use the active tenant, session, and term when building assignment options, so that admins assign from the correct academic context.
34. As an academic officer, I want existing selected-subject and all-subject department assignments to keep working, so that current staff records do not break.
35. As an academic officer, I want existing teacher authorization tests to keep passing, so that this feature extends access without weakening current protections.
36. As a developer, I want a single effective-access resolver for teacher academic scope, so that all screens and mutations use the same access logic.
37. As a developer, I want broad assignments stored as durable grants rather than materialized into many subject rows, so that future departments and subjects can be included dynamically.
38. As a developer, I want legacy department-level assignments to map cleanly into the new effective-access model, so that migration can be incremental.
39. As a support user, I want clear error messages when a teacher cannot access a selected class or subject, so that access problems can be diagnosed quickly.
40. As a school owner, I want these assignment scopes to work for senior-secondary schools and also for any tenant with a class-to-department hierarchy, so that the product stays configuration-driven.

## Implementation Decisions

- Treat the feature as an extension of staff academic authorization, not as a senior-secondary-only module.
- Keep `ClassRoom` as the parent class/level concept and `ClassRoomDepartment` as the department/arm concept.
- Keep `Subject` as the reusable subject catalog row and `DepartmentSubject` as the active-term subject offering inside one classroom department.
- Add or introduce a canonical staff academic access grant shape that can represent class-level, department-level, class-subject, and department-subject scopes without requiring row explosion.
- Keep the existing staff term profile as the term/session owner for teacher assignments.
- Preserve existing department-level `SELECTED` and `ALL` behavior. Existing rows should continue to mean "selected subjects in this classroom department" or "all subjects in this classroom department."
- Prefer dynamic effective-access resolution over backfilling every covered department subject into explicit staff-subject rows.
- Define effective access as the union of all active grants for the staff member in the active tenant, school session, and session term.
- Resolve whole-class grants by finding non-deleted classroom departments under the selected class for the active school session, then resolving non-deleted active-term subjects under those departments.
- Resolve class-subject grants by finding non-deleted active-term department-subject rows for the selected subject under all non-deleted departments in the selected class.
- Resolve department grants by finding non-deleted active-term department-subject rows under the selected classroom department.
- Resolve department-subject grants by finding the matching non-deleted active-term department-subject row in the selected classroom department.
- Do not automatically create missing subject offerings when a subject-across-class grant is saved. Grant access to matching offerings that exist now or are added later under the covered class.
- Validate every saved assignment against tenant, session, and term ancestry on the server.
- Treat soft-deleted classrooms, departments, subjects, department subjects, staff profiles, term profiles, and assignments as inaccessible.
- Update staff form data so assignment options can be grouped by class and department, with subject options available at both class and department scope.
- Update staff save/edit validation to accept the new assignment scope vocabulary and reject incomplete or contradictory payloads.
- Update staff list and staff overview summaries to display effective classroom and subject coverage, not only explicit department rows.
- Update teacher workspace data loading to use the effective-access resolver for visible classrooms, subjects, students, attendance history, and counts.
- Update teacher authorization helpers so classroom, department-subject, and assessment checks all accept the new broad grant types.
- Update assessment/report APIs that currently check classroom or subject access to call the shared effective-access authorization path.
- Keep non-teaching roles outside teacher classroom/subject assignment unless a separate role policy is designed later.
- Keep tenant isolation as a non-negotiable boundary: broad grants cannot cross school profile, session, or term context.
- Add a migration/backfill strategy that preserves current assignments as equivalent department-level grants. If a new grant table is introduced, current rows may be left as supported legacy input or backfilled into the new table with compatibility reads.
- Keep UI copy user-facing and school-friendly: use labels such as `Class`, `Department/Arm`, `Subject across class`, and `Subject in department`.
- Reuse existing report sheet, assessment recording, and teacher workspace surfaces instead of building parallel pages for senior-secondary assignment.

## Testing Decisions

- Highest-value test seam: the effective teacher academic access resolver. It should accept a staff member, tenant, session, and term, then return effective classroom department IDs and department subject IDs for all grant types.
- Keep tests behavior-focused: verify what the teacher can see or mutate, not the private implementation details of how grants are stored.
- Add resolver tests for whole-class access: `SS 1` should include Art, Commercial, Science, and all active-term subjects under them.
- Add resolver tests for department access: `SS 1 -> Art` should include only Art students/subjects, not Commercial or Science.
- Add resolver tests for class-subject access: `SS 1 -> Mathematics` should include Mathematics department-subject rows in Art, Commercial, and Science, but not English or Biology.
- Add resolver tests for department-subject access: `SS 1 -> Art -> Mathematics` should include only the Art Mathematics department-subject row.
- Add tests for future subject behavior by creating a new matching department-subject after a broad grant and verifying access resolves without adding a new staff-subject row.
- Add tests for future department behavior under a whole-class grant and class-subject grant.
- Add negative tests for another class, another department, another subject, another term, another session, another tenant, and soft-deleted records.
- Add tests for overlapping grants to ensure effective classrooms and subjects are deduplicated.
- Add staff save/form-data tests to verify the new scope payload round-trips and rejects invalid combinations.
- Add teacher authorization tests for classroom access, department-subject access, and assessment access using broad grants.
- Add report sheet or assessment recording integration tests showing a teacher can load and write only within effective broad scopes.
- Add regression tests for existing selected-subject and all-subject department assignments.
- Reuse the existing staff management, teacher workspace, assessment, and report-sheet test patterns where available.
- Run the relevant API and dashboard typechecks after implementation.

## Out of Scope

- Automatically creating subject offerings in every department when a teacher is assigned to a subject across a class.
- Changing the core class, department, subject, assessment, or student enrollment data model beyond what is required for access grants.
- Timetable generation or teaching-period scheduling.
- Payroll, finance, HR attendance, or workload calculation changes.
- Public assessment-recording links; those are covered by the existing public assessment link work.
- Parent/student portal authorization changes.
- Granting non-teaching roles broad academic access.
- Cross-school, cross-tenant, cross-session, or cross-term teacher access.
- A full academic hierarchy normalization project; this spec should work with the existing `ClassRoom` and `ClassRoomDepartment` model.

## Further Notes

- Example mapping: `SS 1` is a `ClassRoom`; `Art`, `Commercial`, and `Science` are `ClassRoomDepartment` rows under that class; `Mathematics` is a `Subject`; each department's offered Mathematics row is a `DepartmentSubject`.
- Existing issue #23 covers classroom-wide subject assignment and public assessment-recording links. This spec is a follow-up focused on senior-secondary hierarchy-aware teacher assignment scopes.
- The selected testing seam is the effective teacher academic access resolver, with staff save/form-data and assessment/report authorization as integration seams.
- This feature should update Brain docs for staff management, API permissions/contracts, and database schema/relationships when implemented.
