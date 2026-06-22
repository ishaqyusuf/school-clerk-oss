# Staff Management

## Purpose
Track staff directory, invite onboarding, role access, and teacher assignment behavior.

## Current Behavior
- Admins can create or edit staff from the dashboard staff sheets using an invite-first flow.
- The staff form captures email, role, and teacher-only classroom/subject assignments.
- Non-teaching roles do not require classroom or subject assignment and persist empty assignment sets.
- Each teacher assignment targets one classroom and one or more active-term subjects for that classroom.
- Subject selection in each classroom assignment supports bulk `Select all` and `Deselect all` controls so admins can quickly assign or clear the full subject list for that classroom.
- Staff onboarding is completed from the reset-password flow after the staff member sets a password and fills visible profile details. The title field remains in the action schema but is hidden in the onboarding form for now.

## Related Docs
- `brain/api/contracts.md`
- `brain/api/permissions.md`
- `brain/database/schema.md`
