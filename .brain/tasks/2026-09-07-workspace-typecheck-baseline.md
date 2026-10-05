# Task: Restore Workspace Typecheck Baseline

## Status
In Progress

## Priority
High

## Created Date
2026-09-07

## Last Updated
2026-09-07

## Global Ticket
- Ticket Position: 1/1 (verification prerequisite)

## Source Context
[Full pending work execution](2026-09-07-pending-work-execution.md). Existing API, dashboard, and Jobs failures prevent reliable verification of multiple pending workstreams. Baseline commit: f348dbd539ca81968ad50cfe3108b5bcc6ed0716 on main. Preserve behavior and strictness; fix underlying contracts/configuration instead of excluding failing sources.

## Implementation Progress
- Completion: 67%
- Current Checklist: 5/6 — Verification deferred to final phase
- Blockers: None

## Implementation Checklist
- [x] Reproduce current API, dashboard, and Jobs typecheck failures.
- [x] Fix API academic-term test invocation and preview typing without weakening transaction safety.
- [x] Fix shared dashboard fallback typing and dependency-boundary imports without visual changes.
- [x] Implement Jobs module-resolution and shared strictness fixes identified by the initial compiler output; final verification is deferred.
- [ ] Pass affected tests and full workspace typechecking; complete standards/specification review.
- [ ] Commit implementation and synchronize task/portfolio evidence.

## Validation Evidence
- Started scoped package typechecks on 2026-09-07. Existing compiler checks and affected regression suites are the reproduction harness; no new behavior or visual design is intended.
- All three failures reproduced: API tuple invocation/preview correlation, dashboard unknown-error boundary and undeclared Radix imports, and Jobs NodeNext source-resolution cascade. Logs: `/private/tmp/school-clerk-{api,dashboard,jobs}-baseline.log`.
- API and dashboard typechecks passed after the initial fixes, before the user's testing deferral. These are not sign-off for subsequent edits.
- Jobs uses ESNext/Bundler like Midday's Trigger package without disabling strictness. Remaining implicit contracts are being typed at their owning layers.
- Academic tests initially exposed missing student-gender lookup in the existing fixture; fixture now includes that lookup and the canonical ALL_GENDERS audience. Its latest edits have not been rerun.
- User directed all further testing to the final, user-resumed phase. Validation/review/commit completion remain unchecked; implementation is uncommitted.
- Code implementation now covers explicit pagination/count models, optional request-context identifiers, captured tenant IDs, duplicate-query delegates using the configured Database type, finance-item payload types, shared utility inputs, and missing test-fixture data. Enrollment filters carry no pagination fields, so that caller supplies empty pagination options while retaining its separate where clause.
- Last in-flight dashboard check (started before the deferral) reported only the enrollment pagination weak-type mismatch. The corresponding implementation fix has not been rerun. No new test/check processes were started after the user's deferral.
- Static Midday conformance: existing file ownership preserved, no new dependency, bundled-job resolution matches the reference, and UI props use the shared package. Broader package-to-app imports predate this change and are not rearchitected by this prerequisite. No visual changes were made.

## Midday Implementation Contract
1. Reference compared: target Jobs tsconfig, shared ErrorFallback/ApiErrorState, API context/query helpers, academic setup/reset; Midday Jobs tsconfig, dashboard ErrorFallback, API trpc/init.ts, and package-boundary/API-DB-Jobs guidance.
2. Principle: bundler resolution for bundled jobs, unknown errors at UI boundaries, explicit tenant and query contracts in API, shared primitives through UI package exports.
3. Filesystem: modify existing owning files only; do not introduce new route, package, or dependency for type corrections.
4. Routes/pages: retain current ErrorBoundary/Suspense/refresh composition; no route changes.
5. Header/open buttons: not applicable; no new UI interaction.
6. Sheets: not applicable; existing sheets unchanged.
7. Forms: not applicable; no form migration.
8. Filter/search/URL state: retain pagination cursor/sort behavior; type its current contract.
9. Tables: no layout/selection changes.
10. Columns/row actions: derive menu prop types from the shared UI component rather than an undeclared Radix dependency.
11. Bulk actions: not applicable; no bulk UI changes.
12. API/data: retain transaction safeguards; explicitly type optional request context and capture validated tenant IDs across async transactions; no schema changes.
13. Testing/QA: all further checks deferred by explicit user request; final phase must run academic/duplicate/student/enrollment/query utility regressions and full workspace types. This type-only dashboard change introduces no new visual layout.
14. Open questions: none for the implementation; validation is deliberately deferred, not passed.
