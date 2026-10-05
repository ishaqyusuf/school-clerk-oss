# ADR-0049: Guarded student registration

- Date: 2026-09-08
- Status: implemented in source; verification deferred
- Related: CORE-002, ADR-0045–0048

## Decision and ownership

Follow the inspected Midday customer schema/protected-router/tenant-query pattern. Keep browser-safe validation in utils; the API registration service owns one Serializable transaction and payment orchestration; DB helpers own fresh actor, academic target and guardian resolution plus canonical/enrollment persistence. Existing `students.createStudent` and its query-file export delegate to this service. The compatibility `createStudentForm` wrapper no longer starts a nested transaction or mutates its caller's guardian input.

The active stored session/user and selected school must belong to the same live, non-purging account. Registration requires current Admin/Registrar and Students. Class placement additionally requires Academics + Finance because it applies automatic charges. Receiving a payment requires Admin: Accountant is a finance writer but cannot create students, and Registrar is not a finance writer. The existing payment adapter receives the live transaction role, not the earlier context role.

## Academic and guardian integrity

Validate every supplied term against the selected school/session and the selected live classroom's session ancestry. Reject closed, foreign or duplicate terms. Check exact duplicate student names per requested class/term before any registration write. With no class and no enrollment/fee request, create only the canonical student and optional guardian; do not synthesize incomplete session or term forms. Each new academic row receives its canonical student ID at creation.

Preserve explicit multi-term input only within the selected session/classroom. Preserve existing billing semantics: required and selected optional fees apply only to the current term if included, otherwise the first requested term. No retroactive fees are introduced for other terms. Reject stale/non-optional/inapplicable selected optional IDs. Positive payments must match newly assigned initial-term charges and remain subject to existing amount/ledger rules; any failure rolls back student, guardian, academic, charge and payment writes. Legacy nonempty `fees` payloads now fail validation and must use current selections/payment fields.

Resolve guardians by exact supplied ID or name/phone within the current school, including archived collisions via explicit `deletedAt: {}`. Reject unavailable IDs, archived contacts and conflicting supplied details. Reusing a live guardian links a new ward without changing the shared contact, assigning a login, restoring history or adopting another school. Name-only or primary-phone-only creation remains supported. Secondary phone alone requires a primary identity.

## Client and response contract

Shared input bounds IDs/text/arrays, trims names, rejects non-finite or negative payments and duplicate term/optional-fee selections. Optional `submissionScope` binds displayed school/user/login session/academic session/term to the live actor and request context; it is not authorization. Existing student/guardian/session response and `feeHistoryApplication`/`feePaymentSummary` envelopes remain. P2034/P2002 return CONFLICT with directory/refresh guidance; unknown failures return fixed internal-error copy. There is no automatic mutation retry.

The URL-owned create sheet keys its form to school/user/login-session/academic selection and withholds the editor when identity is unavailable. Scope changes discard that form's draft and mutation result. A late response from an unmounted form may invalidate directory data but cannot navigate the replacement form. Footer errors explain checking the directory after interrupted responses; controls wrap and use 44px targets. Existing fee-preview readiness gating remains. No table/filter/global-store replacement was needed for this mutation slice.

## Limits and deferred checks

No new schema, dependency, live data action, backfill, email, deployment or commit. No tests, test writing, typechecks/builds/lint/formatters or browser/mobile/keyboard QA. Source/whitespace inspection is not behavioral proof. Later cover role/module revocation, direct calls, mismatched scope/ancestry, closed terms, guardian identity/history collisions, duplicate/concurrent/replayed requests, rollback at each stage, required/optional fees, payment overages, no-class registration and 320/375/768 layouts.

This transaction provides a point-in-time authorization snapshot, not instantaneous concurrent revocation. It does not establish global student-name uniqueness or durable idempotency; interrupted canonical-only registrations must be checked in the directory before retry. Legacy dashboard create/import/repair writers and full finance consistency remain open. CORE-002 and the entire pending portfolio are not complete.
