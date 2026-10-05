# ADR-0045: Student academic reads stay inside the active school

- Date: 2026-09-08
- Status: Implemented in source; verification deferred
- Task: CORE-002

## Context

Student term history previously selected a school through the submitted student ID, rather than requiring the active school. Overview joined guardian and academic metadata without consistently checking live related records or both module capabilities. Router-only module checks did not guard direct service calls.

## Decision

Use Midday's tenant-bound customer-detail router/query pattern. The app API validates bounded student/term/term-sheet IDs, orchestrates a shared guarded read and maps DTOs; `packages/db` owns live session/account/school context and constrained record queries. Keep Prisma and existing explicit package exports, with no new dependency or schema.

`students.overview`, `students.academicsOverview` and `academics.getStudentTermsList` require live Admin/Registrar and effective Student Management plus Academic Programs. The service repeats stored-session/current-role/account/school/module checks for direct calls. These are mixed-projection requirements, not a new global dependency of Students on Academics. Parent/teacher-specific access must use separately scoped projections, not this management endpoint.

A RepeatableRead transaction covers authorization and data. Require the canonical student in the active school before any history or guardian read. Guardians, academic terms/sessions, term forms, session forms and classroom ancestry must be live and school-owned. Additionally compare term, term-form, session-form and classroom session IDs before returning placement metadata. Never infer tenant identity from a foreign student.

Preserve school-term history and overview response envelopes. Exactly one valid term form is needed to expose its link. Duplicate valid forms withhold that term's enrollment/classroom linkage. A missing-term placement fallback is permitted only when all valid same-session forms agree on one student-session/classroom tuple; no term-form ID is synthesized. Explicit invalid/mismatched term-sheet or term selection returns NOT_FOUND. Academic overview now builds its student summary from this same snapshot instead of the general directory query; default selection is the latest ordered valid enrolled term, not an unrelated active-context fallback. Guardian summary comes from the earliest live school-owned relation, deterministically ordered.

## Limits and verification

No stored record cleanup, guardian reassignment, schema push, live action or UI layout changes. Other student directory/detail/analytics/mutation paths, dedicated overview error recovery and client cache isolation remain coverage work. No assertion of complete CORE-002 enforcement or immediate revocation after a snapshot.

All tests, typechecks, builds, lint, browser and mobile QA are deferred by user instruction. Later checks must cover foreign IDs, direct service calls, expired sessions/deleted accounts, role/module changes, archived/mismatched ancestry, duplicate forms, multiple placements, explicit selector disagreement, response compatibility and mobile error recovery. Source inspection is not behavioral proof.
