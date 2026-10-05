# Student Import Midday Implementation Contract

## 1. Reference Compared
Target: modal index, import activities, review-model, draft-storage, parser, student-import Brain feature contract, existing six tickets. Midday: import-modal/index.tsx, context.tsx, select-file.tsx, field-mapping.tsx; feature-flow, dashboard-tables, state-and-routing guidance.

## 2. Migration Principle
Keep the working two-stage import and durable jobs. Match Midday folder-owned step components and pure model utilities rather than expanding the monolithic review file. Newer Brain decisions retain automatic classroom headers with optional fallback, compact candidate labels, classroom-scoped execution, admission status and skipped-only completion. These supersede stale ticket criteria.

## 3. Filesystem Plan
Extract setup-form.tsx (presentation/schema) and review-footer.tsx (counts/readiness/action). Index owns modal URL, parsing, queries and persisted draft. Review-model remains the pure browser-safe selection model. Correct existing row/toolbar layout in import-activities.tsx.

## 4. Route/Page Plan
No route migration. Keep action=student-import and existing tRPC ownership. Enable setup reads only while open; expose reference-data loading/failure recovery before review starts.

## 5. Header And Open Button Plan
Retain accessible dialog title/description/close. Stack setup defaults on narrow phones. Collapse review defaults on phones to leave room for rows and a persistent footer.

## 6. Sheet Plan
No new sheet: this is a transient import modal. Keep viewport-constrained keyboard-operable candidate popovers. Preserve drafts on close per School Clerk's recovery contract rather than copying Midday's reset behavior.

## 7. Form-To-Sheet Plan
Extract the setup step, not a sheet. Preserve React Hook Form, fallback classroom, gender, raw text, parsing and draft persistence. Show readable query failures and retry controls.

## 8. Filter/Search/URL State Plan
Keep modal URL, classroom filter and row search. Do not put sensitive paste data into URLs. Keep transient/draft state local and server data in TanStack Query.

## 9. Table Plan
One scrolling attention/matched/ready surface, stable line-number keys, empty/loading states, fluid desktop columns and stacked mobile rows. No column DnD, resizing, pagination or virtualization: this is an editable in-memory batch, not a directory.

## 10. Columns And Row Actions Plan
Preserve checkbox, name/gender controls, classroom label, candidate summary, action/admission controls, search and more menu. Make sole candidates explicitly selectable. Prevent edits on imported/importing rows. Use touch-size controls and readable focus/labels.

## 11. Bottom Bar / Bulk Actions Plan
One persistent footer with total/checked/executable/blocked/unchecked/skipped counts for the active classroom scope. Reuse payload builder and skipped-only completion. Remove duplicate top execute action.

## 12. API/Data Plan
No parser, inference, matching, schema, router, job, payload or invalidation changes. Block setup-to-review transition while reference data loads/fails so late name-guide data cannot silently reinterpret a started review.

## 13. Testing And QA Plan
All checks deferred by user. Final phase must cover parser/error/readiness tests, types, browser setup loading/error/empty/valid cases, ambiguous classes, single/multiple candidates, row actions/skips, scoped payloads, job recovery/completion, 320/375/768 widths, landscape/keyboard, Arabic labels, focus return and screen readers.

## 14. Open Questions
None blocking implementation. Verification remains pending.

## Conformance Audit
- Code-level implementation: setup and footer extracted to owning files; index retains query/draft orchestration; existing pure review model reused; no parser/API/job/schema changes; responsive classes remove rigid row minima and add phone-sized inputs; imported rows are disabled; candidate selection includes a single result.
- Intentionally retained newer School Clerk behavior: automatic header detection (no separate mode toggle), compact candidate metadata, visible row search, optional fallback, classroom-scoped execution, admission status and skipped-only completion.
- No new sheet/context provider, virtualized table, pagination, column resizing or DnD: these are not needed for the local staged import. Context is unnecessary for two direct step components; existing index props and import-local state provide ownership without another state layer.
- Runtime/type/accessibility conformance is NOT signed off. All six tickets remain In Progress until the deferred verification/review/commit phase.
