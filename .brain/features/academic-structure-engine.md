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

## Implemented Term Lifecycle

- `SessionTerm` supports `DRAFT`, `READY`, `ACTIVE`, and `CLOSED` lifecycle states.
- `SchoolProfile.activeSessionTermId` is the canonical active-term pointer, with date-based selection retained as a legacy fallback.
- The new-term setup previews and selectively carries classrooms, subjects and assessment definitions, same-session student term forms and fees, and teacher term assignments.
- `StaffProfile` remains school-scoped. `StaffTermProfile` and its classroom, subject, and grant records are session-and-term scoped and are included in rollover.
- Cross-session student movement remains the responsibility of the promotion workflow.
- Closed terms reject normal assessment, attendance, and enrollment writes.
- See `academic-term-lifecycle-and-rollover.md` and `ADR-0015-explicit-academic-term-lifecycle-and-idempotent-rollover.md`.

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
- Order every class-only list by `ClassRoom.classLevel`, then class name and id.
- Order every classroom-department list by parent `ClassRoom.classLevel`, then `ClassRoomDepartment.departmentLevel`, then class name, department name, and id. Missing levels sort after configured levels.
- Order departments nested under one class by `departmentLevel`, then department name and id.
- See `ADR-0017-centralized-classroom-level-ordering.md`.

## UI/UX Notes
- Use institution-aware labels (for example, `Term` vs `Semester`, `Subject` vs `Course`).
- Show only hierarchy controls relevant to tenant configuration.
- Prevent invalid combinations at form level.
- The global Subjects page lists one canonical tenant `Subject` per row rather than repeating each active-term `DepartmentSubject` assignment. A Classes column shows the distinct number of canonical classes using that subject in the active term, without counting separate streams or duplicate assignments more than once. On mobile, each canonical subject renders as a compact card with its class usage count, matching the responsive Classroom list pattern; medium and larger screens use the two-column table. Classroom subject workspaces continue to use `DepartmentSubject` because their assessment and assignment actions require the classroom-specific record.
- The classroom index keeps search and view mode in one shared filter control. `View by` offers Stream and Class choices, with Stream used when no explicit view filter is set.
- Classroom index actions remain directly visible on large screens. At the medium breakpoint and below, `Add Classroom` and `Import from Session` move into a single `More` menu without changing their existing workflows.

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
