# Design Import Verification And Conflict Algorithm

Labels: `wayfinder:research`
Status: Resolved
Blocked by: [Specify Signed Workbook Contract](specify-signed-workbook-contract.md), [Define Score Normalization And Validation Contract](define-score-normalization-and-validation-contract.md), [Define Authorization And Workbook Security Model](define-authorization-and-workbook-security-model.md)
Blocks: [Define Bare Subject Resolution And Assessment Creation Transaction](define-bare-subject-resolution-and-assessment-creation-transaction.md), [Choose Import Execution Audit And Idempotency Model](choose-import-execution-audit-and-idempotency-model.md), [Design Assessment Workbooks Workflow And RTL Review UI](design-assessment-workbooks-workflow-and-rtl-review-ui.md)

## Question

How should upload verification convert a signed workbook and current database state into a deterministic, reviewable import plan with no hidden writes?

## Context

The upload is bound to its original term and classroom. Unchanged cells are ignored, blanks are no-ops, valid changed cells may create or update records, concurrent database changes produce conflicts, new roster members are absent but acceptable, and stale populated student rows block import.

## Resolve

- Define verification phases and ordering from file envelope through signed metadata, current authorization, live entities, structural checks, score parsing, and conflict comparison.
- Define row, column, and cell statuses plus stable error codes.
- Define three-way comparison between downloaded value, uploaded value, and current database value.
- Define assessment rename, maximum-change, deletion, soft-deletion, reparenting, and subject-removal behavior.
- Define newly enrolled, transferred, deleted, duplicate, or re-enrolled student behavior.
- Define how Bare Subject Columns enter an unresolved state without invalidating the signed workbook.
- Define the immutable import-plan payload sent to review and later apply.
- Guarantee that verification performs no assessment or score writes.

## Expected Answer

A deterministic verification state machine and import-plan schema covering happy path, no-op, conflict, stale entity, invalid data, and unresolved-column cases.

## Comments

Use a three-way comparison of downloaded, uploaded, and current database values. If uploaded equals downloaded, classify it as unchanged; if current still equals downloaded, accept the uploaded change; if uploaded already equals current, classify it as no-op; if current and uploaded independently diverged, create a conflict requiring review. Verification must produce an immutable import plan with row/column/cell statuses and perform no writes.

## Resolution

Implemented a pure read-only preview planner with stable summary/change/blocker output. It accepts new roster members, ignores entirely blank stale rows, blocks populated stale rows, and uses downloaded/uploaded/current values to protect concurrent online edits.
