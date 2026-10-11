# Student form suggestions

## Status

Direction 01 (Inline check) selected by the owner on 2026-10-11 and implemented. Component/browser and focused business-logic QA pass. Full application acceptance and production release remain pending; see the implementation plan.

## Behavior

The existing registration sheet groups first name, surname, and optional other name before an inline suggestions panel. All supplied name fields affect ranking: case-insensitive exact matches first, records containing every supplied field second, and clearly labelled partial matches last. Suggestions include live same-school identities across classes, including enrolled students. Five records load at a time with Show more and displayed/total counts.

The shadcn Checkbox defaults checked. Unchecking cancels outstanding suggestion queries and disables new suggestion requests, including name changes and cache invalidation. Checking again uses the current fields. The separate shadcn Collapsible only hides or reveals results; collapsing keeps search enabled. At least one name field needs two characters. Deferred input must match the current input before a query can start.

Rows show formatted name, DOB/guardian when available, current-term class/stream, and enrollment/review state. Name matching never automatically selects an identity. View record opens a temporary shadcn Dialog without changing registration URL state or clearing the draft. There is no historical-class read in this implementation.

Admin/Registrar can edit a single approved current-term placement through the existing `students.classChangeOptions` and `students.bulkChangeClass` boundaries (ADR-0055). Pending, ambiguous, unavailable-class, and conflicting identity links have no Edit class action. The destination must be current/available; an unchanged class disables save. A successful move refreshes suggestions and the established enrollment/history caches. Existing fees, scores, and attendance semantics are unchanged. The registration draft remains open.

Unenrolled records retain explicit enrollment into the draft's selected class via `academics.entrollStudentToTerm`; the draft must still refer to the active session/term. Existing role, module, tenant, class, term and Finance validation stays authoritative on the server. Duplicate submission is guarded and results from an old/unmounted workspace cannot close the current draft.

## Data and permissions

`students.suggestions` is an authenticated Student Management module read. School/session/term come from the authenticated profile. Optional client view scope is checked against the live profile/user/login session, and the live term must belong to the school/session. Deleted and foreign school identities/relations are excluded. Only approved, unambiguous, owned current-term class links are editable. No new mutation or database schema is introduced.

The API accepts trimmed `name`, `surname`, `otherName` (max 200 each), page size 1–25 (default 5), a bounded bucket/offset cursor, and optional school/user/login/session/term view scope. Response: `data` records plus `meta.count`, `meta.matchingCount`, and `meta.cursor`. Counts span all matches, not just the loaded page. Pages are ordered by match strength then stable student ID. Cached rows and open dialogs are hidden immediately when the active workspace changes. Concurrent register edits may shift offsets; the client de-duplicates IDs.

## UI states and implementation ownership

Use shared shadcn Collapsible, Checkbox, Badge, Item, Button, Alert, Skeleton, Dialog, and Select; shared source components are unchanged. UI orchestration, rows/dialogs, query/enrollment hooks, input schema, API scope adapter, and DB query are separate files. Disabled, short-name, unavailable workspace, loading, empty, error/retry, pagination, mutation pending/failure, and read-only states are explicit.

## Verification

Ten focused Bun tests cover rank refinement, cross-page ordering, bounded pagination beyond five, foreign/deleted exclusion, enrollment/review classification, stale workspace/login rejection, and live term ownership. The isolated Chrome fixture exercises the real UI and query/mutation hooks with fictional identity/API transport: checkbox defaults, zero requests while unchecked, latest names on re-enable, collapse, pagination, class correction, draft retention, record dialog, retry, read-only role, dark mode, and 390px/320px overflow/dialog bounds. Both application stylesheets are used. This is component QA; it does not prove a live database mutation or full registration/Finance integration.

## Production release verified — 11 October 2026

Application and release migration commit: `8ab727c84981acd9cc8f21e3f90a063856ef1466`.
Dashboard `dpl_3smuwBqdeg5GvR15WpUwS5XGTiLd` and Marketing
`dpl_8ppJFiMw21xwsfenuFpLZ3MghbqH` are READY for that exact Git SHA,
with existing production aliases assigned. Trigger project
`proj_wiixtfwfyigtsruijbqd` deployed version `20261011.1`, deployment
`kt7yktps`, with five detected tasks. The shared release exited zero and
`bun release status --production` reports nothing to release.

The initial Vercel polling call failed on temporary DNS resolution after Git
push; the unchanged shared command resumed successfully without another code
push. Component success tags are published; archive/release-assurance-v1 preserves
the old source. Database baseline stays at d6f43f0; no schema or school-record
write occurred and newer unrelated assistant database objects were preserved.

Authenticated production Chrome verification: default-checked suggestions;
first-name search produced 18 live matches; Show more displayed 10 of 18;
surname refinement ranked the one combined match above 18 partial matches;
current class and Edit action were visible. The class dialog loaded the current
class, disabled unchanged Save, and Cancel preserved draft names. Collapse left
search checked; unchecking displayed the off state even after changing a name;
rechecking restored latest-name results. No console errors were captured. No
student create, enrollment or class-change mutation was submitted. Production
screenshot: `.scratch/student-form-qa/production.jpg` in the working checkout.

Focused validation: 32 shared release-flow tests (129 assertions), 13 project
tests (42 assertions), Biome and diff checks, optimized Dashboard and Marketing
builds. Earlier desktop/mobile component QA verified mutation and error paths
with fictional transport. Full workspace typecheck retains pre-existing errors;
clean full Dashboard checking hit its memory limit. Local HTTPS full-app QA was
unavailable because cmux was closed; authenticated live suggestion-flow checks
above provide the production smoke evidence.
