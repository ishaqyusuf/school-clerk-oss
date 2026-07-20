# ADR-0015: Explicit Academic Term Lifecycle And Idempotent Rollover

## Status

Accepted - 2026-07-19

## Context

The previous "new term" surface mixed session creation with term creation, showed static readiness, and delegated to a migration path that deleted target records before copying a subset of academic data. It did not carry teacher term assignments, had no durable active-term pointer, and could activate a new context without proving that finance closure or cross-session student progression was complete.

Teacher identity also spans two lifetimes: `StaffProfile` belongs to the school, while teaching scope belongs to a session and term through `StaffTermProfile` and related assignments.

## Decision

- Model term state explicitly as nullable legacy-compatible `DRAFT`, `READY`, `ACTIVE`, or `CLOSED`.
- Store the school's canonical active term in `SchoolProfile.activeSessionTermId`.
- Persist every confirmed rollover in `AcademicTermSetupRun` with a tenant-scoped unique idempotency key.
- Make rollover additive and match existing target rows instead of deleting target data.
- Include subject assessments, same-session student term forms and fees, teacher term profiles, classroom assignments, academic grants, and legacy subject links.
- Keep `StaffProfile` permanent; create or reuse term-scoped `StaffTermProfile` rows.
- Reuse classroom structure within a session and copy/match it across sessions.
- Block cross-session student copying and require the promotion workflow.
- Require the outgoing finance ledger to be closed before activation or explicit academic closure.
- Reject normal academic writes against `CLOSED` terms.
- Keep date-based active-term discovery only as a compatibility fallback when the canonical pointer is absent.

## Consequences

- A term is not operational merely because its dates include today; administrators explicitly activate it.
- Retries are safe and return a stored receipt.
- Existing target records survive reruns and partial recovery.
- Finance closure becomes a prerequisite for academic context switching.
- Teacher access continues to resolve from term-specific records after rollover.
- Legacy terms remain readable until they are brought under the explicit lifecycle.
- Reopening a closed academic term is intentionally not exposed; it requires a future audited administrative decision.
