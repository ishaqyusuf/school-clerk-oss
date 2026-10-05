# ADR-0050: Unowned legacy migration containment

- Date: 2026-09-08
- Status: containment implemented in source; ownership and verification pending
- Related: CORE-002, ADR-0049

## Evidence and decision

The `/migration` route imports historical student data and reads global `student-migrate-data`, `student-genders` and `student-merge-data` Posts records using shared cache keys. Its actions update numeric post IDs, replace global datasets, create 1445/1446 records, and mix historical import with unguarded registration/enrollment helpers. Posts has no school/account ownership field. Source searches found the dashboard's legacy create/enrollment helper callers only in this migration workflow; supported registration uses the separately guarded tRPC service.

Do not infer ownership from the active workspace, dataset dates, names, static assets or module entitlement. Ask the user for the owning school ID/slug or an explicit retirement decision. This is a separate dataset family from the already-flagged 1446/1447 FTD records. No dataset is reassigned, inspected live, restored, deleted or migrated.

While the binding is unresolved, all sixteen identified legacy data/cookie/action entrypoints call a server-only gate before transaction, cache or data work. The gate first requires live Admin access to Students + Academics + Finance, then rejects even that actor because the dataset has no approved owner mapping. There is no enable flag, success-shaped no-op or claim that Admin can bypass ownership. Existing legacy implementation source remains behind the gate for a future approved scoped replacement.

## Architecture and UI

Follow Midday's app orchestration/private server module and thin-route/compositional-UI boundaries. `/migration` loads only authorization/status and renders a dedicated responsive ownership-required notice with a fixed `/students/list` link. It imports no historical data, list/store/auto-create component or legacy loader. Server guards also protect direct actions; replacing the page alone would not suffice. Cookie-backed name/gender migration state is unavailable too, but existing browser cookies are not erased.

The notice uses wrapping text, a constrained full-width container and a 44px mobile action. Table, filters, review, import execution and migration cache redesign are intentionally pending ownership resolution, not silently treated as completed features. Normal registration and reviewed import code are not routed through this legacy gate.

Remove the unused API `updateStudentTermFormStudentId` helper: repository caller/export checks found only its definition, and it globally discovered/rewrote missing student/classroom links without a tenant-scoped authorized workflow. Only source was removed, recoverable from Git; no stored row was repaired or deleted. Any future repair needs an explicit scoped integrity plan.

## Verification and remaining work

Source searches/readback identify sixteen pre-work gates and no remaining repair-helper caller/definition in app/package source. Scoped tracked-file whitespace checks passed. No tests, test writing, typechecks/builds/lint/formatters, browser/mobile/keyboard QA, live DB actions, cache purge, schema/dependency change or commit.

Deferred checks must prove direct actions deny before legacy cache/DB/cookie effects; unauthorized status reads deny; narrow viewport/keyboard notice behavior; and supported registration/import remain unaffected. Historical functionality is still incomplete. Resuming requires approved owner mapping and full tenant-scoped data/cache/transaction/fee-conversion implementation, or authorized retirement. Generic post writers/1446–1447 FTD and remaining student mutation boundaries remain separate open work. CORE-002 and the portfolio stay active.
