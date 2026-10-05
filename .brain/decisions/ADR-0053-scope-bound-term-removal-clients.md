# ADR-0053: Scope-bound term-removal clients

- Date: 2026-09-08
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0052, student academic overview

## Decision

Use one dashboard `useRemoveStudentTerms` hook for the seven mutation instances in directory row actions/bulk bar, student overview, promotion, progression single/bulk actions and report filters. Follow the inspected Midday customer table's provider-owned mutation and query-key invalidation pattern. Local confirmation state remains in its owning view; domain authorization and atomic archive semantics remain in the shared DB service from ADR-0052. No new route, store, schema, dependency or persistence layer is needed.

The hook normalizes single/bulk selections into the bounded bulk RPC and includes the displayed school/user/login-session scope. Readiness requires a resolved matching profile and Admin/Registrar role; this is a UI guard, not a substitute for fresh server authorization/module checks. Workspace keys also include academic session/term; each caller supplies its relevant student/selection/route context. Each hook prevents overlapping submissions, disables mutation retries and offline queues, and shows errors only in the originating context. Completion callbacks require the same mounted, ready context. A changed view cannot consume an old success to clear selection, navigate or show a success toast.

Committed results still invalidate directory/analytics/duplicates, owned student overview/history, submitted term details, classroom lists, promotion lists, report/print status and global search through standard provider query keys even if their originating view changed. Record invalidations use returned validated student IDs and submitted term IDs; aggregate invalidations cover the relevant query families. This does not make existing unscoped read keys safe or certify every report/directory read boundary.

## Confirmation and mobile behavior

Directory batches reject unavailable selected rows and selected students without a term record rather than submitting a smaller batch. Progression rejects incomplete selections and batches above 100. Dialogs retain server errors, prevent implicit dismissal during submission, use viewport-capped scrolling and 44px wrapping actions, and close/reset stale workspace selections. Report-filter removal uses the provider hook, a native confirmation and an accessible 44px actions trigger; overview/progression retain their existing native single-removal confirmations.

Copy describes term-form archival, preserved financial/assessment/attendance history and unchanged outstanding balances. Promotion's detail summary stacks on narrow screens. Repeat-result toasts distinguish already-archived records from new removals. These are source-level responsive provisions; no mobile/browser behavior has been verified.

## Limits and next work

Follow-up: ADR-0054 subsequently implements the independent term-detail read service, scoped hook and extracted preview dialog. The original next-work assessment below is historical; broader reads, mutations and verification remain open.

The read-only `students.getTermFormDetails` still needs its own live authorization, mixed-domain projection and view-scope/cache audit. Sharing a removal schema or invalidating its query does not confer those protections. Broader directory/report reads, class changes, promotion/lifecycle mutations and remaining domain/portfolio work remain open. Per-hook single-flight is not a global lock or idempotency guarantee; server transactions remain responsible for concurrent requests. Interrupted responses require a refresh before retrying.

## Evidence and deferred verification

Read back the hook and callers against Midday provider/state/package patterns. Source search identifies seven hook instances and only the shared hook as the direct current dashboard term-removal mutation-options owner. Scoped tracked-file `git diff --check` passed. No tests/test writing, typechecks/builds/lint/formatters, browser/mobile/keyboard QA, live removal, schema operations or commits.

After implementation is finished and the user resumes verification: exercise identity/academic/selection switches, unmounts, late responses, cache invalidation, unavailable selections, bounds, pending controls, interrupted/offline failures, server conflicts/repeats and 320/375/768-width touch/keyboard confirmations. CORE-002 remains 5/10; portfolio remains 0/14 verified.
