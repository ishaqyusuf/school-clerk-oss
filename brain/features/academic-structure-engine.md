# Academic Structure Engine

## Purpose
Defines a flexible academic hierarchy that supports multiple institution models without hardcoding one structure.

## How To Use
- Update when hierarchy levels or naming rules change.
- Keep data model and API behavior synchronized.
- Use this doc as the source for academic hierarchy implementation.

## Feature Name
Academic Structure Engine

## Goal
Allow each tenant to define and run academic operations across term-based or semester-based systems with optional departments/programs.

## Users
- School admins
- Academic officers
- Teachers and lecturers
- Students (indirectly through enrolled structure)

## Flow
1. Tenant selects institution type.
2. Tenant configures hierarchy (session -> term/semester -> level/class -> optional department -> optional program).
3. Student/staff enrollment references configured hierarchy nodes.
4. Attendance, assessment, billing, and reporting resolve context from hierarchy nodes.

## Data Model
- `institutionType` enum on tenant profile (planned).
- Academic nodes with typed levels and parent-child relationships (planned).
- Enrollment links students/staff to hierarchy nodes (partially present, needs normalization).
- TODO: align existing `SchoolSession`, `SessionTerm`, `ClassRoom`, and department/program entities to one canonical structure.

## APIs
- Read tenant hierarchy configuration.
- Create/update hierarchy nodes.
- Resolve valid next-level nodes based on institution type.
- Validate enrollment against configured hierarchy.

## UI/UX Notes
- Use institution-aware labels (for example, `Term` vs `Semester`, `Subject` vs `Course`).
- Show only hierarchy controls relevant to tenant configuration.
- Prevent invalid combinations at form level.

## Permissions
- Only privileged admin roles can modify hierarchy definitions.
- Staff can read hierarchy based on assigned scope.

## Edge Cases
- Tenant switches institution type after data exists.
- Missing optional layers (no department/program).
- Hybrid systems with both class-level and department-level structures.

## Metrics
- Configuration completion rate.
- Time to create academic structure.
- Enrollment errors caused by invalid hierarchy.

## Open Questions
- Final normalized hierarchy schema design.
- Migration plan for legacy/parallel academic models.
