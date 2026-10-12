# ADR-0077: Attendance draft ownership in the classroom workspace

- Date: 2026-10-12
- Status: Implemented locally; component browser regressions passed
- Extends: ADR-0064 draft retention guarantee

## Context

The mobile classroom sheet removes its primary content while a secondary student
form is open. Attendance state belonged to the recorder inside that removed
content, so opening Add student destroyed unsaved marks and session details. The
sheet also reparents content when switching responsive layouts. Roster cache
invalidation alone cannot preserve state after unmount.

## Decision

Own the draft in a focused React context above the classroom sheet and its
Suspense/error boundaries, adapting Midday's parent form-context pattern.
Key the provider by authenticated user/login session, school, academic
session/term and selected classroom. The inline create recorder consumes this
draft; correction and teacher recorders continue using local state.

Preserve marks, remarks, session details, rendered roster range, previous roster
keys and the payload-bound idempotency ref across child unmounts. Roster refresh
adds unmarked students without overwriting existing marks. Clear marks/remarks
only after successful attendance save or an explicit clear action. Provider
identity changes or closing the classroom discard the draft.

Do not change shared shadcn component lifecycles, automatically save attendance
on registration, persist student remarks in browser storage, or change the API.

## Conformance and validation

Reference: Midday invoice/form-context.tsx, invoice-content.tsx and the Midday
state/routing rules. App-local ephemeral state stays above the dynamic content;
TanStack Query retains roster ownership and current invalidation paths. UI uses
existing shadcn controls/sheet wrappers. Routes, URL params, API contracts, table
layout, permissions and database remain unchanged because this is a draft
lifetime repair. Two actual-component browser tests plus eight focused utility
/roster tests pass. Focused draft TypeScript and new-code lint pass. Full-stack
QA and repository typecheck limitations are recorded in attendance.md.
