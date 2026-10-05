# ADR-0056: Scoped class-change client and destination options

- Date: 2026-09-08
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0055

## Decision and architecture

Add a dedicated `students.classChangeOptions` read and one `useMoveStudentTerms` hook for overview and directory bulk moves. Follow Midday's schema/protected-router/DB-query and provider-owned mutation/query-key patterns. Preserve parent-local destination/confirmation state and existing route/table composition; no new store, sheet, schema migration or dependency is needed. This supersedes ADR-0055's pending client-integration milestone, not its historical-domain or verification limitations.

## Destination read

Shared `studentClassChangeOptionsSchema` accepts 1–100 distinct bounded/trimmed studentTermFormIds plus optional school/user/login-session viewScope. The API service rechecks direct callers using current stored session/account/school and Admin/Registrar + Students/Academics in one RepeatableRead transaction. Displayed identity must match; it never establishes authority.

DB-owned reads validate every live owned source term form, matching parent/canonical student, same-school live session/term and open-term status. All selected records must derive one academic session; mixed, unavailable or inconsistent selections return errors rather than partial options. Null direct student IDs require the matching owned parent. Return only that session's live same-school classroom IDs/display labels, derived sessionId, sorted requested form IDs and matching scope. No roster/statistic/finance data is exposed. Empty valid destinations are distinct from unavailable enrollment context.

The picker is advisory. It does not reserve a class or certify destination duplicate-name, parent-default, source-placement or concurrency checks; ADR-0055's transaction rechecks the complete write rules when submitted.

## Client behavior

Both current callers replace broad classroom/statistic queries and direct single/bulk mutations with the shared provider hook. The hook normalizes selected IDs, binds query/mutation to the displayed school/user/login session, checks returned identity/selection agreement and masks loading/refetch/error/paused/placeholder/mismatched options. Mount/focus/reconnect and explicit refresh reauthorize. Inactive option caches have zero retention; current data must contain the explicit destination before submit is enabled.

Workspace, known role, academic context, originating record/selection and chosen target bind local error/success callbacks. A single-flight guard prevents overlap per hook. Mutations disable retries and offline queues. Successful responses always invalidate returned owned student/term records plus directory, duplicates, classroom, promotion, assessment report/print, attendance roster/report/history, destination options and search query families. Local toasts, selection clearing, closing and overview refresh run only in the originating mounted identity/context. Mutation-triggered option refetch does not by itself suppress an otherwise current success callback. Canonical deletion and term removal also invalidate the new options query.

Known selection/context changes clear the explicit target instead of inheriting it. Missing loaded rows block the entire directory batch. Loading, unavailable, empty and removed-target states are explicit; refresh never resubmits. Both paths distinguish moved versus already-in-class results. Bulk confirmation remains open on failure, while overview retains an explicit native confirmation. Existing session-default/history preservation copy stays visible: fees, scores and attendance are not remapped. Destination triggers/items, confirmation actions and refresh controls use 44px wrapping/touch provisions with accessible labels. No rendered/mobile behavior is verified.

## Limits and deferred checks

Authorization is point-in-time, not instant push revocation or universal stale-record version control. Per-hook single-flight is not a cross-tab lock; the backend transaction remains authoritative. This does not certify broad legacy classroom endpoints for other callers, admission/fee reconciliation, class-bound history transfer or remaining domain/lifecycle/portfolio work.

Source readback and caller search confirm one current direct class-change mutation owner, two hook consumers, removal of broad picker reads in those consumers and scoped ID-compatible invalidations. Scoped tracked-file `git diff --check` passed. No tests/test writing, typechecks/builds/lint/formatters, browser/mobile/keyboard QA, live reads/mutations, schema operations or commits.

Later prove direct/forged/stale scope, closed/foreign/mixed-session/malformed selection, zero destinations, null IDs, response/selection mismatch, target removal, refresh/offline errors, late/unmounted callbacks, repeat counts, invalidation, retained history and 320/375/768-width keyboard/touch flows. CORE-002 remains 5/10; portfolio remains 0/14 verified.
