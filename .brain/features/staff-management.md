# Staff Management

## Purpose
Track staff directory, invite onboarding, role access, and teacher assignment behavior.

## Current Behavior
- Admins can create or edit staff from the dashboard staff sheets using an invite-first flow.
- The staff form captures email, role, and teacher-only classroom/subject assignments.
- Non-teaching roles do not require classroom or subject assignment and persist empty assignment sets.
- Each teacher assignment targets one classroom and either selected active-term subjects or all subjects in that classroom.
- Subject selection in each classroom assignment supports bulk `Select all` and `Deselect all` controls so admins can quickly assign or clear the full subject list for that classroom.
- Classroom-wide subject access uses `ALL` mode on the classroom assignment; it grants access to every current and future subject in that classroom without creating one explicit staff-subject row per subject.
- Senior-secondary style academic access grants are available through `StaffAcademicAccessGrant`. The grant scopes are `CLASS`, `DEPARTMENT`, `CLASS_SUBJECT`, and `DEPARTMENT_SUBJECT`, and they resolve dynamically against the active tenant, school session, and term.
- The staff invite/edit form can now save whole-class grants, department/arm grants, and subject-across-class grants. Precise subject-in-department assignment is represented by selecting one or more department subjects under a department/arm assignment.
- Teacher authorization, teacher workspace summaries, assessment recording context options, subject lists, and classroom report sheet reads now use the shared effective access resolver so broad grants and legacy selected/all department assignments resolve through one path.
- Staff directory summaries and staff overview metrics use effective classroom/subject coverage so broad grants are reflected in teacher workload counts rather than only explicit legacy assignment rows.
- Staff onboarding links use 24-hour Better Auth reset-password tokens. The reset-password flow checks token status before submission so expired onboarding links show an explicit expired-link message instead of a generic invalid-token error.
- Staff onboarding is completed from the reset-password flow after the staff member sets a password and fills visible profile details. The title field remains in the action schema but is hidden in the onboarding form for now.

## Classroom-Wide Subject Access
- Teacher assignments support a classroom-wide access mode so a teacher can be assigned to one classroom and automatically receive access to every current and future subject in that classroom.
- The default scope remains teacher-only; non-teaching roles should continue to persist empty classroom/subject assignment sets unless a separate role policy is intentionally designed later.
- Each classroom assignment supports two access modes:
  - `SELECTED`: the current behavior, where admins choose one or more active-term subjects manually.
  - `ALL`: grants access to all active-term subjects in the assigned classroom and automatically includes subjects added after the assignment.
- Existing selected-subject assignments remain valid and should continue to behave as explicit subject permissions.
- Teacher subject authorization must expand classroom-wide access anywhere subject permissions are checked, including assessment setup, assessment recording, score updates, report-sheet reads, and teacher workspace subject lists.
- The staff invitation/edit UI presents the choice as `Selected subjects` versus `All subjects in this classroom`.
- `ALL` is stored as a durable classroom assignment setting rather than backfilled into explicit subject permission rows.

## Hierarchy-Aware Academic Access Grants

- `CLASS`: grants every current/future department under the class plus active-term subjects in those departments.
- `DEPARTMENT`: grants every current/future active-term subject in one department/arm.
- `CLASS_SUBJECT`: grants the selected subject wherever it is offered under the selected class for the active term, including matching future department-subject offerings.
- `DEPARTMENT_SUBJECT`: grants one active-term subject offering inside one department/arm.
- Legacy `StaffClassroomDepartmentTermProfiles` and `StaffSubject` rows remain supported by the resolver for incremental migration and compatibility.

## Related Docs
- `brain/api/contracts.md`
- `brain/api/permissions.md`
- `brain/database/schema.md`
