# ADR-0063: Provisional student term review

Date: 2026-09-27
Status: Local implementation

## Context

Teachers need to record attendance and assessments for learners before office
staff finish registration. Some submissions refer to historical students.

## Decision

Store review state on `StudentTermForm`. A teacher submission creates a
provisional canonical `Students` row so existing classroom and scoring flows
can use their normal term-form key immediately. New non-teacher-created term
forms default to `APPROVED` for compatibility. Admin/Registrar review can
approve the provisional identity or match the term form to an existing
same-school student with no enrollment in that term. Matching preserves the
term-form ID and associated attendance and score history; the unused
provisional student is soft-deleted. Rejection retains the request and its
history but excludes the term form from active recording and print surfaces.

All submission and review writes recheck the school, classroom/term, role or
teacher assignment, and current review state server-side. Matches are
suggestions, never automatic identity merges.

## Limits

This review state does not create an admission decision or apply fees. A
separate enrollment/admission workflow owns those decisions. Production schema
rollout and signed-in browser acceptance are pending.
