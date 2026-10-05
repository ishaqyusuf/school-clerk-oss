# ADR-0058: Student profile and gender transactions

- Date: 2026-09-08
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0047, ADR-0049, ADR-0057

## Architecture and authority

Both `students.updateStudentBasicProfile` and `students.changeGender` now use bounded browser-safe profile schemas, a thin API adapter and DB-owned `updateStudentProfile`. Follow Midday customer form/provider/schema/router/query boundaries; keep SchoolClerk Prisma and existing editor/sheet/table composition. Extract ADR-0057's preparation into internal `prepareStudentTermFeeReconciliation`, retaining its error compatibility export and selected-form ownership/charge/lock rules. Extract shared student/finance query invalidation for both client hooks. No schema, route, dependency, job or unrelated UI redesign is required.

Live stored session/user/account/school, Admin/Registrar and Students are always required, including direct calls. Submitted school/user/login scope must agree. Lock the canonical student and recheck expiry after waiting. Changed gender with active academic references additionally requires Academics and Finance. Basic text/date/guardian changes and unchanged gender do not independently recalculate fees or require those extra modules.

## Gender and finance

Discover active term forms through both direct canonical and parent identities; reject inconsistent school/session/term/parent links rather than silently skipping them. Preserve fees attached to closed academic terms or closed ledgers and return their form IDs explicitly. Reconcile every open selected form through the shared preparation/cancellation contract, with a 100-open-enrollment ceiling requiring a reviewed batch beyond it. No archived term or canonical linkage is repaired.

Open-term fee effects, canonical profile and guardian-link/contact writes commit together under Serializable isolation. Concurrent/conflicting changes return explicit review errors, without retry. Paid/manual/waived/allocated/ledger-linked charges remain protected by ADR-0057. Closed-term financial preservation does not freeze demographic fields in reports: canonical name/gender changes can appear wherever reports read current student identity. Historical demographic snapshots are not introduced.

## Guardian behavior

Omitted guardian input leaves links unchanged; null/all-blank contact fields explicitly remove the sole active link, not the guardian/contact/login. Partial contact inputs are invalid. Multiple or foreign/archived active links require review instead of selecting the first record. New contacts require name/primary phone. Existing owned active contacts may be reused without rewriting; archived records are never revived.

Editing the currently linked contact is allowed only when it has no login and no other active ward; collisions including archived contacts fail. Another/shared/login-bound contact cannot be silently rewritten, and linking a different login-bound contact requires a separately reviewed parent-identity operation. No user identity/password/email/verification or notification delivery changes occur. Changes to one owned link remain scoped and exact-count checked.

The dedicated shared-guardian editing experience is not implemented by this guard. The user was asked whether shared edits should live in a dedicated editor or the student editor with explicit all-wards confirmation; response is pending. This remains portfolio follow-up, not an invented approval.

## Client and result

Return `{studentId, updated, genderChanged, guardianChanged, reconciliation, preservedTermFormIds}`. Reconciliation rows expose form ID and applied/cancelled/retained counts, not raw charges/amounts. A basic save returns updated 1; a gender-only matching repeat returns 0 and performs no fee reconciliation.

`useUpdateStudentProfile` handles both provider-backed RPCs, scope-bound single-flight/no-retry/no-offline-queue submission, failure retention and invalidation even after the originating view disappears. Identity/role/academic context/student/editor draft or gender-control context fences local callbacks. Basic editor refresh/close and gender updated callbacks are not triggered by late responses into another context. Shared invalidation covers student detail/directory, term detail including name-only changes, finance summaries/statements/collection/receive views, reports and attendance.

The basic footer explains fee/contact effects and displays wrapping errors with full-width narrow-screen save controls. The reusable gender control replaces static tRPC imports, adds explicit confirmation, 44px labelled trigger/menu items and visible errors. Targeted source search found the editor consumer and reusable gender component, not evidence that the latter is currently mounted elsewhere. All UI behavior remains unverified.

## Evidence and open work

Source inspection confirms compatibility exports, removal of old first-guardian/unscoped/reconciliation functions and guarded router paths. API/DB/client responsibilities follow the inspected Midday references. No automated tests, typechecks, builds, lint, browser/mobile/keyboard/visual checks, schema/live actions, sends, jobs, deployments or commits occurred. Import reconciliation, shared guardian editing, broader finance/lifecycle boundaries and every remaining portfolio workstream stay open.
