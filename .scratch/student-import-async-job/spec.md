Status: implemented

# Student Import Async Job Spec

## Problem Statement

In production, student batch import fails once the selected row count reaches a certain size. The current reviewed import flow still executes selected rows through a single dashboard-to-tRPC request, so large imports can be limited by request duration, response parsing, serverless runtime limits, request body constraints, tenant routing, or transient network failures.

From the school operator's perspective, the import can appear to be working during review, then fail during execution after they have already resolved duplicates, classrooms, gender, and row actions. The operator needs a reliable way to start a large import, see progress, recover from partial row failures, and avoid repeating work or accidentally creating duplicates.

## Solution

Introduce a durable student import job feature for large reviewed imports.

The dashboard should continue to use the current prepare, verify, review, and row-resolution flow. When the operator executes many selected rows, the dashboard should create a server-side import job instead of keeping the whole execution inside one HTTP request. The job should process import rows in small chunks, persist progress and row-level results, and expose job status back to the UI.

The user experience should feel like a normal import with progress: start import, watch processed rows increase, see created/kept/updated/failed/skipped counts, inspect row-level failures, and close or reopen the modal without losing the import state. Small one-row imports can continue to use the existing direct execution path where appropriate.

## User Stories

1. As a school admin, I want large student imports to continue after I click execute, so that production request limits do not stop the import.
2. As a school admin, I want to see import progress while rows are processed, so that I know the system is still working.
3. As a school admin, I want progress to show processed rows out of total rows, so that I can estimate how much work remains.
4. As a school admin, I want progress to show created students, kept matches, updated matches, term sheets created, skipped rows, and failed rows, so that I understand the outcome.
5. As a school admin, I want failed rows to be listed with line numbers and reasons, so that I can fix only the problem rows.
6. As a school admin, I want successful rows to remain successful if the import has a later failure, so that I do not lose completed work.
7. As a school admin, I want the import job to survive a browser refresh, so that I do not need to keep the tab perfectly stable.
8. As a school admin, I want the import job to survive temporary network interruption, so that the server can keep processing rows.
9. As a school admin, I want to reopen an active import and see its current status, so that I can continue monitoring it later.
10. As a school admin, I want duplicate protection during background processing, so that retries do not create duplicate students or duplicate term sheets.
11. As a school admin, I want row-level idempotency, so that retrying the same job row does not apply the same action twice.
12. As a school admin, I want exact-match keep actions to remain safe in background execution, so that existing students are enrolled without identity changes.
13. As a school admin, I want update-match actions to remain explicit in background execution, so that student names are only changed when I selected that action.
14. As a school admin, I want import-new actions to keep the existing duplicate checks, so that accidental duplicate records remain blocked.
15. As a school admin, I want row classroom validation to remain tenant, session, and term aware, so that students are not imported into the wrong classroom.
16. As a school admin, I want the import to fail individual invalid rows instead of aborting the whole job, so that one bad row does not block the class.
17. As a school admin, I want the UI to clearly distinguish running, completed, completed-with-failures, failed, and cancelled import jobs, so that I know what action to take.
18. As a school admin, I want the dashboard to disable duplicate execution while a job is running, so that I do not submit the same reviewed rows twice.
19. As a school admin, I want a completed import to refresh student lists, analytics, recent student records, and classrooms, so that the dashboard reflects the new records.
20. As a school admin, I want the current single-row import action to stay fast, so that I can still fix or execute one line without starting a large background job.
21. As a school admin, I want the system to choose the background job path for large selected batches, so that I do not have to understand production limits.
22. As a school admin, I want the import summary to be available after completion, so that I can confirm what happened before closing the modal.
23. As a school admin, I want failed job rows to be reusable for a later import attempt, so that I can correct and retry without reprocessing successful rows.
24. As a school admin, I want imported line numbers to remain connected to the original reviewed rows, so that the result is easy to audit.
25. As a school admin, I want job errors to be shown as friendly import errors, so that raw HTML or infrastructure failures do not confuse operators.
26. As a school admin, I want tenant scoping to be enforced for job creation, status reads, and job execution, so that one school cannot access another school's import.
27. As an accountant, I want term sheet fee history application to happen during background import the same way it happens during direct import, so that finance data remains consistent.
28. As a registrar, I want multi-classroom imports to preserve row-level classroom targets in the job payload, so that mixed-class imports work correctly.
29. As a registrar, I want skipped rows to be counted but not processed, so that review decisions remain respected.
30. As a developer, I want the background worker to reuse the existing student import execution rules, so that direct and job execution do not drift.
31. As a developer, I want persisted job state, so that progress is observable without relying only on Trigger.dev run state.
32. As a developer, I want row results persisted separately from aggregate counters, so that support can diagnose production import issues.
33. As a developer, I want chunk size to be configurable or centralized, so that production tuning does not require changing multiple call sites.
34. As a developer, I want retries to be safe at the job and row level, so that Trigger.dev retry behavior does not corrupt records.
35. As a developer, I want focused tests around external behavior, so that refactors to chunking or worker internals do not break the contract.
36. As a support operator, I want import job records to include who started the job and when, so that tenant support can answer audit questions.
37. As a support operator, I want the final job state to include a concise failure summary, so that production issues can be triaged quickly.
38. As a product owner, I want this feature to reduce production import failures without removing the existing review workflow, so that schools keep the safety checks they already use.

## Implementation Decisions

- Build a new durable student import job path instead of relying on recursive client-side mutation loops.
- Keep the existing student import preparation, parsing, verification, review, matching, gender resolution, row action, and single-row execution behavior.
- Add a job-start API surface that accepts the same reviewed execution rows currently sent to batch execution, validates tenant/session/term/classroom context, creates a persisted import job, queues the background task, and returns identifiers needed by the dashboard.
- Process jobs in Trigger.dev under `packages/jobs`, matching the repository's existing async work boundary.
- Persist import job status in the database rather than relying only on browser state or Trigger.dev run state.
- Persist row-level job results keyed by job and line number so retries and UI summaries remain deterministic.
- Reuse the current student import execution business rules for import-new, keep-match, update-match-with-name, duplicate checks, term sheet creation, conflict handling, and fee-history application.
- Extract or wrap the row execution logic so both direct execution and job execution call the same domain behavior.
- Process rows in small chunks, likely 25 to 50 rows per chunk, and update progress after each chunk.
- Keep per-row database transactions so one row failure does not rollback successful rows.
- Make job execution idempotent by treating a completed job row as already applied and skipping or returning its stored result on retry.
- Store aggregate counters on the job, including total rows, processed rows, created students, kept matches, updated matches, term sheets created, skipped rows, and failed rows.
- Represent job status with a small state machine such as pending, running, completed, completed_with_failures, failed, and cancelled.
- Expose a status/read API for the dashboard to fetch current job progress and row results.
- Use Trigger.dev realtime status where useful, but keep the product UI driven by persisted job state so refresh and support workflows remain reliable.
- Let the dashboard choose the job path for selected-row batch execution, especially for large batches.
- Preserve direct `executeStudentImport` for single-row import and possibly very small batches if the team wants to keep that fast path.
- Invalidate or refresh student, classroom, analytics, and recent-record queries after job completion.
- Record tenant, user, active session, and active term on the job at creation time so the worker does not depend on browser/session cookies.
- Ensure job creation and status reads enforce tenant ownership.
- Add Brain documentation updates for the student import feature, API contract, database schema, and background job architecture.
- Add an ADR if the implementation establishes a reusable background job pattern for large dashboard mutations.

## Testing Decisions

- Primary test seam: the student import job API contract from job creation through progress/status reads and final row results. This is the highest useful seam because it verifies the behavior the dashboard depends on without coupling tests to internal chunk loops.
- Secondary test seam: the extracted student import row execution service shared by direct execution and job execution. This protects idempotency, duplicate checks, term sheet creation, row-level failure behavior, and fee-history application.
- Dashboard tests should verify the external UI states: starting a job, showing running progress, displaying completed counts, showing failed line reasons, disabling duplicate execution while running, and refreshing completion state.
- Worker tests should verify that chunked execution updates job progress and does not reapply completed rows when retried.
- Tests should focus on behavior and persisted outcomes rather than implementation details such as exact helper names or loop structure.
- Prior art includes existing student import tests around `verifyStudentImport` and `executeStudentImport`, existing dashboard import error handling, and existing Trigger.dev task usage for staff invitation email.
- Add regression coverage for production-like large selected batches that previously failed through one HTTP request.
- Add multi-tenant access tests for job status reads so one tenant cannot inspect another tenant's import job.
- Add retry/idempotency tests where a job resumes after some rows have already completed.
- Add row failure tests showing one invalid classroom, duplicate, or conflicting term sheet row does not fail the entire job.

## Out of Scope

- Rebuilding the paste parser.
- Changing the matching algorithm.
- Changing gender inference rules.
- Replacing the current review and resolution UI.
- Importing from uploaded CSV or spreadsheet files.
- Adding a generic job framework for every dashboard mutation.
- Manual cancellation UI beyond the minimum needed to represent cancelled jobs, unless implementation discovers it is cheap and safe.
- Full production deployment or Trigger.dev environment setup beyond the code and documented configuration required by this feature.

## Further Notes

- Recursive client-side mutation with a cursor is acceptable only as a short-term workaround. It does not provide durable progress, refresh recovery, server-side retries, or reliable idempotency by itself.
- This spec is related to existing production student import hardening work, but it is a broader reliability feature. It should not replace the existing ticket to fix production tRPC transport returning HTML.
- Brain documentation is part of done for this repository. Expected docs include the student import feature file, API endpoints/contracts, database schema/migrations notes, and the system/background jobs architecture docs.
- If implementation changes Prisma schema and root scripts define both migration and push commands, follow the project rule to run both after updating the schema.
