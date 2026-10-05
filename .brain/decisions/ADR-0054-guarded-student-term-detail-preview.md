# ADR-0054: Guarded student term-detail preview

- Date: 2026-09-08
- Status: implementation written; all verification deferred
- Related: CORE-002, ADR-0045, ADR-0052, ADR-0053

## Decision and architecture

Replace `students.getTermFormDetails` inline relation reads with a dedicated API schema, live-authorized API service and DB-owned projection. Follow the inspected Midday customer schema/protected-router/query boundary while retaining SchoolClerk Prisma and soft-deletion semantics. The exported API service revalidates direct callers; the DB query accepts trusted scope/access decisions from that service. The router requires Students + Academics with Admin/Registrar.

Keep promotion's confirmation state local, but extract its dialog to `components/students/student-term-removal-dialog.tsx` and query wiring to `hooks/use-student-term-details.ts`. No new route, table, sheet, global store, dependency or schema migration is needed. A bounded confirmation preview is not a replacement for full assessment, attendance or finance workspaces.

## Authorization and integrity

Resolve current stored session/user, live non-purging account and same-account school inside one RepeatableRead transaction. Require current Admin/Registrar role and effective Students/Academics modules. Optional `viewScope` contains school/user/login-session identity plus role and module revision; supplied values must match before record reads. Scope is a cache binding, never authority.

Find a live same-school term form. Validate its parent session form, canonical student, live same-school academic session/term and any classroom/department ancestry. A null direct student ID can resolve only through its matching owned parent; no backfill or repair. Missing/archived form returns NOT_FOUND; inconsistent ownership/ancestry returns CONFLICT. Canonical student names are read only after those checks from the owned live student. Closed terms remain readable but return `canRemove: false`; removal separately rechecks its own transaction.

Assessment and attendance sections each require their respective module. Finance requires Finance plus the existing finance-read role intersection: only Admin among this preview's Admin/Registrar roles. Restricted sections perform no domain query and return neither counts nor rows.

For permitted sections, compare active attached-reference counts with ownership-valid counts in the same snapshot. A mismatch withholds that section as unavailable instead of returning a misleading filtered zero. Assessment records require the same canonical student (or an unambiguous null direct ID), live assessment/department subject, matching class/term and same-school subject. Attendance requires matching school/class/term attendance parent and any subject ancestry. Missing classroom context withholds classroom-bound sections. This does not rewrite historical links or expose mismatched record identifiers.

Finance charges must match school/student/term/session, student payer type, non-staff/payee identity and a live same-school stream. Charge-linked allocations additionally require an owned live student payment and stream. Allocation amounts represent only the amount applied to these charges, not an entire receipt spanning other terms. Amounts are decimal strings. Cancelled non-archived records retain their explicit status. Unallocated payments, archived rows and a complete balance/ledger statement are intentionally outside this preview.

## Response and UI contract

The old `{counts, assessmentRecords, studentFees, payments, attendance}` response with fabricated finance zeros is replaced, coordinating the only current consumer. The new response includes `id`, owned `student`, formatted `studentName`, `scope`, `canRemove`, `previewLimit: 50` and four sections: `assessments`, `attendance`, `charges`, `allocations`. Each section returns `{status: available | restricted | unavailable, count: number | null, rows}`. Withheld count is null and rows empty; available count covers current qualifying rows, with deterministic previews capped at 50 and an explicit showing-N-of-total label.

The hook uses standard identity/role/revision-bearing tRPC keys and verifies returned scope. It masks stale/refetch/error/paused/placeholder/mismatched data; known module/role changes select a different key. Mount/focus/reconnect and explicit retry reauthorize; retry first refreshes module configuration. Inactive detail caches have zero retention. This is point-in-time authorization, not instant push revocation or certification of unrelated caches.

The dialog uses current server-derived student identity, independent section notices, inline retry/failure states, viewport-capped scrolling, wrapping content and 44px actions. Confirmation requires current preview readiness and an open term; shared removal mutation still provides final authority. Restricted/inconsistent optional history is explicitly unknown, not empty, and is retained by removal. No balance cancellation is implied. Narrow-screen behavior is implemented by construction, not verified.

## Evidence and remaining work

Source readback covers schema/service/DB projection/export, hook/dialog and caller replacement. Caller search finds the dedicated hook as the sole current detail-query consumer and the shared removal hook's ID invalidation still matches scoped inputs. Scoped tracked-file `git diff --check` passed. No tests/test writing, typechecks/builds/lint/formatters, browser/mobile/keyboard QA, schema/live operations or commits.

Later verify forged/direct/stale identity and revision inputs, each role/module intersection, archived/malformed/foreign ancestry, null direct IDs, reference-count mismatches, cancellation/decimal/allocation semantics, 50-row truncation, module/role changes, late/cache/offline responses, closed terms and 320/375/768-width confirmation/focus flows. This is not global domain-enforcement completion. Class-change/session-placement consistency, broader report/directory reads and every other portfolio workstream remain open; CORE-002 stays 5/10, portfolio 0/14 verified.
