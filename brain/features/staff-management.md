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

## Related Docs
- `brain/api/contracts.md`
- `brain/api/permissions.md`
- `brain/database/schema.md`
