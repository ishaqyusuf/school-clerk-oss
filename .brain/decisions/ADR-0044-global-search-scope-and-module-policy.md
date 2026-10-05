# ADR-0044: Authoritative global search scope and category permissions

- Date: 2026-09-08
- Status: Implemented in source; verification deferred
- Task: CORE-002

## Context

Global search previously queried students for any authenticated role and exposed classroom student counts without a student-module boundary. Record query keys omitted explicit workspace/user/policy identity. Local navigation search did not pass tenant module state to the navigation resolver.

## Decision

Follow Midday's schema → protected router → query service → DB ownership pattern, retaining the existing Postgres fuzzy ranking and repository UI. A new authenticated scope read validates the stored login session, current user, active account/school and optional school-owned academic session. Supplied identity fields are cache bindings, never credentials; bearer authorization remains mandatory. Shared pure policy produces permitted categories and a role/module/revision signature. Record requests must present the current signature and repeat authorization in the same RepeatableRead snapshot as SQL reads.

Students require Admin/Registrar plus Student Management; staff retain Admin/Teacher/HR plus Staff Management; classrooms require Admin plus Academics. Classroom counts and student-tab links additionally require Student Management. Classroom/session/form/student ancestry must agree with the school; counts use distinct live students. Unconfigured/invalid modules and unknown roles do not receive record access. This does not grant directory access to parents or teachers through the student category.

The client owns separate scope and record queries keyed by school/user/login session/academic session and, for records, policy/query/limit. Local pages/actions use the scope's effective modules. Hide results during scope refresh/failure and record refresh/failure, reject placeholder data, collect unused caches immediately, and refresh scope on conflict, focus and a mounted 30-second interval. Existing destination routes must independently authorize access; search is not their authorization mechanism.

## Consequences and limits

- Permission changes are checked at request time, not through instantaneous push revocation. A transaction represents a consistent point-in-time view, not a lock against subsequent policy changes.
- Existing fuzzy SQL and role choices are retained except closing the unrestricted student category. No semantic search, database schema change, entitlement provisioning or historical data migration.
- The command panel uses viewport-capped height, scrolling, constrained content, and 44px close/retry/result controls. Mobile/keyboard/browser behavior is not yet verified.
- Defer tests, typechecks, builds, lint and browser/mobile QA. Later coverage includes identity/workspace changes, disabled modules, role/category matrix, count leakage, malformed ancestry, cache/refetch/offline/conflict handling, ranking and narrow-screen keyboard navigation.
- FTD dataset ownership, other aggregates/mixed services, defaults, rollout and full CORE-002 completion remain outside this finished source slice.
