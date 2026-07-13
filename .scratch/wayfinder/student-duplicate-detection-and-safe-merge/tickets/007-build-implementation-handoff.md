# Build Implementation Handoff

Labels: `wayfinder:task`
Status: Open
Blocked by: `000-verify-student-classroom-filter-contract.md`, `001-define-duplicate-identity.md`, `002-inventory-merge-owned-records.md`, `003-design-survivor-selection-and-move-rules.md`, `004-design-detection-and-merge-api-contract.md`, `005-design-student-and-classroom-ui-surfaces.md`, `006-define-data-integrity-guardrails.md`
Blocks: None

## Question

What exact implementation plan should be handed off once the way is clear?

## Context

This ticket should only be resolved after the other tickets have enough answers to avoid re-discovering scope during implementation.

## Resolve

- Files and modules to change.
- Service/API boundaries.
- UI component placement.
- Tests:
  - classroom filter regression tests
  - duplicate detector service tests
  - merge preview tests
  - merge execution transaction tests
  - UI smoke tests
  - import/create/change-class guardrail tests
- Brain documentation updates required after implementation:
  - feature docs
  - API contracts
  - permissions
  - database schema/relationships/migrations if schema changes
- Migration requirements, if any.
- Rollout and manual QA steps.

## Expected Answer

An implementation handoff under the appropriate Brain planning/handoff location, plus a checklist of validation commands and docs to update.

## Approved Comment

The handoff should split implementation into phases: first fix classroom filtering, then add duplicate detection read models, then add merge preview, then merge execution, then UI surfaces, then prevention guardrails. Tests should cover the classroom filter regression, duplicate grouping, survivor recommendation, merge preview, merge execution with moved references, conflict blocking, and import/create/change-class guard behavior. Brain docs to update after implementation: student overview/import feature docs, API contracts, permissions, database relationships, and migrations only if schema/index changes are introduced.
