# ADR-0062: Scoped import reference and preview reads

- Date: 2026-09-22
- Status: implementation written; verification deferred
- Related: CORE-002, ADR-0059–0061

## Decision and architecture

Use a dedicated protected import projection, following Midday router → DB query → provider-client boundaries. `packages/db/src/student-import-reference.ts` owns the consistent reference snapshot; `apps/api/src/db/queries/student-import-reference.ts` adapts errors and exposes name-guide/reference responses. `students.getStudentImportReference`, both preview procedures and the name guide use the Students/Academics/Finance Admin/Registrar procedure and independently require a current stored interactive session, account/school, role and modules. Read scope validates owned session/term plus open academic/finance lifecycle. A separate live access check follows the snapshot, and preview rechecks access after matching. These checks do not promise instantaneous revocation after a response.

Execution and preview share the extracted academic target guard, without requiring a classroom merely to open references. Empty current-session classroom options remain an empty list; submitted classroom IDs must belong to those owned live options. No job authority is accepted for browser reference reads.

## Projection and ambiguity

The snapshot reads only owned active canonical candidate names/gender and current-session classroom options. Direct and parent-linked enrollment references are compared against school/session/term/parent/class ancestry before related labels are returned. Invalid, unmapped or duplicate-term history is flagged; its enrollment metadata is withheld, while the authorized canonical candidate remains available for explicit review. Null direct IDs with consistent parents are recognized without repair. Historical fallback uses deterministic ordering rather than unspecified first rows.

Preview no longer silently keeps the last exact-name candidate. Multiple exact candidates become review suggestions, and a candidate with flagged academic history is not promoted into an automatic full match. Response includes the server-observed school/user/login-session/session/term scope for the forthcoming client-context binding. Arabic waw-hamza normalization now agrees with the parser. Edit-distance work rejects overlong or clearly distant strings before allocating its matrix.

Preview input is shared in utils and bounded to 1–500 distinct nonnegative integer line numbers, 200-character name parts/IDs, 2,000-character original text and known gender values. The setup screen explains the 500-student batch limit. Execution bounds and fully scoped draft/mutation inputs remain separate unfinished work, not implied by this preview contract.

## Client integration

Setup names/classrooms and review candidate/classroom reads now use `getStudentImportReference`, not the broad recent-record/classroom endpoints. Both import components use the provider tRPC client and query client, not static global clients. Errored reference data is withheld; setup retains existing responsive loading/error/retry/back controls. Verification/start/single-row mutations disable automatic retries and offline queues, and completed writes invalidate the new reference query.

This does not yet bind query keys, persisted drafts, last-successful preview fallback, callbacks or job recovery to the displayed identity/academic context. Those remain required next work. The table/sheet/modal/header/filter/selection layout is otherwise preserved; no new route or visual redesign is needed for this projection slice. No mobile responsiveness verification is claimed.

## Deferred verification and limitations

No schema changes, data repairs, live DB/provider/job actions, tests/test files, typechecks, builds, lint, browser/mobile/keyboard QA or commits. Current evidence is targeted source inspection and a scoped tracked-file whitespace check only. After implementation and user-resumed testing, verify unauthorized direct calls, session/role/module loss, foreign/archived/mismatched history, valid parent links, ambiguous exact names, Arabic matching, schema limits, empty classrooms, reference failures, stale previews and responsive setup/review states. Tenant-wide canonical candidate reads remain part of this existing matching design; paging/search scalability and provider recovery are not completed here.
