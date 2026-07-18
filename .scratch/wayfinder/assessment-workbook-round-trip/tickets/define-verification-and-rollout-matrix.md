# Define Verification And Rollout Matrix

Labels: `wayfinder:task`
Status: Resolved
Blocked by: [Specify Signed Workbook Contract](specify-signed-workbook-contract.md), [Define Score Normalization And Validation Contract](define-score-normalization-and-validation-contract.md), [Choose Import Execution Audit And Idempotency Model](choose-import-execution-audit-and-idempotency-model.md), [Design Assessment Workbooks Workflow And RTL Review UI](design-assessment-workbooks-workflow-and-rtl-review-ui.md)
Blocks: [Build Assessment Workbooks Implementation Handoff](build-assessment-workbooks-implementation-handoff.md)

## Question

What automated, workbook-level, security, authorization, concurrency, RTL, compatibility, and production rollout evidence is required before Assessment Workbooks can be enabled?

## Context

This feature reads untrusted `.xlsx` files and performs bulk assessment writes. Correctness depends on package boundaries, signed structure, Unicode normalization, live authorization, three-way conflict detection, assessment creation, atomic execution, and consistent LTR/RTL rendering.

## Resolve

- Define unit tests for workbook schema, signing, parsing, normalization, planning, conflict detection, and idempotency.
- Define integration tests for tenant isolation, teacher assignment scopes, term binding, assessment creation, score upserts, retries, and rollback.
- Define malicious/corrupt workbook fixtures and resource-limit tests.
- Define golden workbook fixtures for boys/girls sections, mixed scripts, bare columns, grouped children, existing scores, and both directions.
- Define spreadsheet-application compatibility and round-trip checks.
- Define browser and mobile accessibility checks for the UI prototype.
- Define performance budgets and maximum supported workbook size.
- Define feature flag, observability, staged rollout, operator support, and failure recovery.
- List required typechecks, focused tests, database workflow, and Brain documentation updates for implementation.

## Expected Answer

A complete acceptance and rollout matrix with fixtures, commands, manual checks, performance/security thresholds, release gates, telemetry, and Brain documentation obligations.

## Comments

Require golden LTR/RTL workbook fixtures, round-trip compatibility fixtures, Unicode normalization tables, three-way conflict matrices, tenant/teacher authorization tests, transactional creation/update tests, retry/idempotency tests, and malicious XLSX fixtures covering ZIP bombs, formulas, macros, external links, altered metadata, unknown versions, and oversized structures. Roll out behind a tenant feature flag with import failure metrics, rejection reasons, duration/cell-count telemetry, and an operator-visible audit trail.

## Resolution

Added 38 shared-package tests covering workbook RTL/protection, round trip, signed tamper rejection, structure exposure, formula/macro/external-link rejection, Unicode normalization, maximum validation, conflict matrices, stale rows, and Bare Subject Column resolution. API/dashboard/package typechecks and local browser smoke are required in the handoff; durable activity/import rows provide first-release auditability.
