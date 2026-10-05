# ADR-0046: Unknown enrollment is not absent enrollment

- Date: 2026-09-08
- Status: implemented in source, verification deferred
- Related: CORE-002, ADR-0045

## Decision

Classify each school term as `enrolled`, `not-enrolled` or `unavailable`. A single fully valid term form is enrolled only when it is also the sole current reference for that term. Duplicate, malformed or mismatched references are unavailable; do not turn a filtered-out record into an invitation to enroll again. Minimal scalar reference reads are anchored to the already-authorized canonical student, never used to select a tenant and never returned to the browser. Unmapped/foreign-school references conservatively make otherwise missing enrollment unavailable. No stored rows are repaired, reassigned or deleted.

Only genuinely not-enrolled terms may inherit an unambiguous same-session placement. Unavailable terms expose no term-form/classroom links. UI shows “Needs review” and a responsive administrator-review/refresh notice; enrollment form and selected-term move/delete actions require the explicit appropriate state. Enrollment form remounts on student/term changes and checks submitted identity against the current visible selection. This is not a replacement for transactional mutation authorization and duplicate prevention.

## View identity and state ownership

Use Midday customer-details sheet/details and typed query-hook ownership, with the existing URL hook for selection. Unlike the inspected customer detail's `keepPreviousData`, this sensitive cross-school surface withholds stale/placeholder/refetch/error/paused data. `viewScope` is a bounded optional school/user/login-session binding in the overview input; when supplied it must match live server context before records are read. Server returns matching scope metadata. It is not a credential, and legacy callers without it still receive the full guarded read.

Dashboard page prefetch, overview sheet/page and basic-info editor share standard tRPC scope-bearing query keys, not hand-built key extensions. Installed tRPC interprets keys of length three as prefixed; appending identity would break request decoding. Invalidation by student ID remains a partial match for all scopes. Unused caches are collected immediately; live results must match visible school/user/login identity and requested student.

Fresh mounts, explicit refresh and mutation invalidation reauthorize. No timer/focus/reconnect refresh silently unmounts an active editor and discards its draft. Auth/workspace identity changes still hide the view; basic-info form context is keyed by scope/student, and no save action renders without current data. Dedicated loading/error/retry UI uses shared Button with 44px targets and wrapping narrow-screen layout. These reads remain point-in-time, not instant role/module push revocation.

## Remaining work

No tests/typechecks/builds/lint/browser/mobile verification, schema change, live operation or commit. Fresh transactional enrollment/record mutation guards, finance-preview isolation, broader student reads, tab-specific domain policy and full UI validation remain unfinished. Later verify foreign/malformed/duplicate/orphan history, scope changes, request races, partial-key invalidation, paused/error reads, draft remounting and keyboard/narrow viewport behavior.
