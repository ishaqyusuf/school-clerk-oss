# Classroom Lists Ignored Academic Levels

## Symptom

Classroom and department lists did not follow one dependable academic sequence. Some routes ordered by class level and department level, some ordered only by names, some ordered only by department level, and some returned database insertion order.

## Root Cause

Each API, dashboard action, and AI tool defined its own Prisma `orderBy` clause. The duplicated clauses drifted apart, and nested applicability lists had no shared in-memory equivalent.

## Resolution

- Added shared class, nested-department, and classroom-department Prisma ordering definitions in `@school-clerk/db`.
- Added a matching in-memory classroom-department comparator.
- Applied the shared contract across classroom, academic setup, student, staff, assessment, enrollment, finance, dashboard-action, cache, and AI list producers.
- Put missing class or department levels after configured levels.
- Recorded the cross-layer contract in `ADR-0017-centralized-classroom-level-ordering.md`.

## Verification

- Focused ordering tests cover the Prisma definitions, deterministic tie-breakers, and in-memory result ordering.
- Database, dashboard, and AI package typechecks pass.
- The API typecheck reaches only the two pre-existing academic-term reset/setup errors.
- Both Standards and Spec review axes pass with no remaining actionable findings.
