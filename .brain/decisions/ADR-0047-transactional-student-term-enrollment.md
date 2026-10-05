# ADR-0047: Guarded transactional student term enrollment

- Date: 2026-09-08
- Status: implemented in source; verification deferred
- Task: CORE-002

## Context and reference

The legacy `academics.entrollStudentToTerm` service accepted optional/unverified classroom and session-form IDs, checked term lifecycle outside its transaction, mutated caller input, and unconditionally created term forms. Automatic fee application made this a mixed academic/student/finance write. Midday's protected router, typed service and package-owned tenant query pattern guides the replacement; existing Prisma and fee application remain the infrastructure.

## Decision

Keep the RPC name and validated service compatibility entrypoint, but delegate to a DB-owned Serializable transaction. Require current stored session/account/school and live Admin/Registrar with Students, Academics and Finance. Require bounded student/classroom/session/term IDs; session-form ID remains optional and must resolve to the correct student/school/session. Classroom is now required so this path cannot create an enrollment its own history reader considers incomplete.

Lock the owned canonical student, recheck session availability after waiting, validate the same school's term/session and classroom ancestry and reject closed terms. Existing scalar/reference integrity checks reject ambiguous or unmapped records. Reuse a single valid current student-session form, or create it; never adopt a foreign one, restore archived records, change its existing placement or mutate request input.

One valid existing enrollment in the requested classroom/session returns `already-enrolled` plus its form IDs, with no new form or fee write. Conflicting/duplicate/malformed history returns CONFLICT. New session form, term form and automatic fee charges share a transaction. Serialization failures map to a refresh-before-retry conflict; the clients explicitly disable automatic mutation retries. This is not a database-wide uniqueness guarantee against unrelated legacy writers.

Because enrollment automatically applies fees, disabled Finance denies this operation rather than silently omitting charges. Overview returns an enrollment capability so mixed read access can remain available without enrollment permission. The fee-preview RPC receives the same role/module requirement. Both preview and shared fee-candidate lookup require a live same-school finance stream; malformed stream-linked items are excluded, not attached across schools. Broader finance integrity repair and complete preview service extraction remain separate work.

## UI and remaining work

Both known clients use the bounded schema/pending controls and explicit error guidance. Find-and-enroll uses provider query hooks, mobile single-column layout and 44px controls. Overview exposes loading/error/not-selected fee-preview states rather than treating failed reads as no fees, distinguishes required auto-applied fees from unselected optional ones, and blocks submit until a preview is available. Server data is still authoritative at write time; a preview is not a price lock or entitlement.

No tests/typechecks/builds/lint/formatters/browser/mobile QA, schema actions, live enrollments/charges, grants or commits. Later verify concurrent/repeated requests, serialization conflicts, closed terms, foreign IDs/session forms, malformed/duplicate histories, rollback during fee writes, disabled modules, expiry while waiting and mobile error/pending/recovery. Other student create/import/enrollment routes and mutations remain uncovered by this service's guarantees; full CORE-002 remains incomplete.
