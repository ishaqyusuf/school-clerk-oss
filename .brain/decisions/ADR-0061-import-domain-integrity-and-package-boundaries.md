# ADR-0061: Import domain integrity and package boundaries

- Date: 2026-09-22
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0057, ADR-0059, ADR-0060

## Architecture

Following the inspected Midday schema/query/job boundary, the execution schema and result types now live in the explicitly exported utils `student-import-schema` module. Public shapes are unchanged, with API compatibility exports. `packages/db/src/student-import-execution.ts` owns transaction-local import business logic and `student-import-processing.ts` owns persisted-job processing. The Trigger task imports `prisma` and `runStudentImportJob` through the DB package's public export instead of API/private DB source paths. An API compatibility processor wrapper remains for existing callers and serialization; worker execution does not depend on it. API-only job dispatch and authorized browser token minting stay in the API layer.

## Identity and enrollment

Both direct and queued execution use the same parsed row operation inside their existing Serializable transaction. Matched students are locked by current school/active canonical ID, followed by current session-or-job authority and owned/open target rechecks. Import-new creates a canonical student and then the same enrollment path; it no longer creates a nested term with a temporarily missing direct student ID.

The enrollment path discovers references through both direct student IDs and session parents. It requires one consistent active session parent, validates school/session/default-class ancestry, rejects duplicate selected-term or selected-session unmapped references, and rejects contradictory direct/parent/term/session ownership. A valid parent-linked form with null direct student ID is reused without repairing that ID. Another classroom rejects the row rather than moving it. Archived parents/forms are never reactivated; ambiguous active links to an archived parent require review. A new active parent can be created when only archived parents exist and no active conflicting reference or retained selected-term fee prevents enrollment.

Exact-name duplicate detection includes owned canonical students connected through direct or parent-linked active class/term forms. It applies to import-new and matched-name changes, and prevents enrolling a matched identity alongside another exact class/term name. It does not merge students or establish global database uniqueness.

## Shared fee preparation

The existing profile/admission preparation now wraps an internal DB helper with an explicit post-lock access callback. Import supplies its real interactive or persisted-job authority and target recheck; it does not fabricate a browser bearer. Existing profile/admission callers retain their stored-session recheck behavior.

Before import enrollment/reclassification, active noncancelled selected student/term charges must already point to the single selected active form. Unbound charges, retained charges on archived/other forms, or charges present before a new enrollment require review instead of adoption or duplication. Shared preparation then checks all attached charge ownership, payer/student/session/term/stream/item/original-class ancestry, duplicate term references and closed ledger/academic term protections under canonical/advisory locks.

New enrollment applies fees once within its row transaction. Existing unchanged-admission enrollment keeps its current fees; it is validated but not repriced. Changed admission reconciles through the existing protected-history rules, retaining paid/manual/allocated/ledger-linked history. Name, enrollment, fee and queued receipt writes roll back together on errors. Matched-row gender remains the stored canonical gender; this path does not silently correct it.

## Conformance and remaining work

No route, modal, table, sheet, filter, selection, URL or responsive layout changed: these are backend/package changes. Scoped import client context, preview/guide/read authority, schema bounds, stale-draft recovery and complete import UI/mobile behavior remain required. Generic duplicate-management/enrollment paths and malformed historical records are not globally repaired by this slice. Provider enqueue recovery, direct-request/cross-job idempotency and legacy RUNNING review remain separate concerns. Drain old worker versions before eventual receipt-protocol rollout.

No schema changes, generated client, database operations, jobs/provider calls, test files, tests, typechecks, builds, lint, browser/mobile QA or commits were performed. Source inspection is not compilation or behavioral proof. Deferred checks must cover direct/worker parity; null direct links; duplicate/foreign/archived parents and forms; retained/unbound/mismatched fees; unchanged versus changed admission; protected financial history; matched-name conflicts; concurrency/crash behavior; Trigger packaging; and later responsive browser/mobile flows. CORE-002 and the full portfolio remain unfinished.
