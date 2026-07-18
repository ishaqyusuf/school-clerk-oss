# Define Bare Subject Resolution And Assessment Creation Transaction

Labels: `wayfinder:research`
Status: Resolved
Blocked by: [Design Import Verification And Conflict Algorithm](design-import-verification-and-conflict-algorithm.md)
Blocks: [Choose Import Execution Audit And Idempotency Model](choose-import-execution-audit-and-idempotency-model.md), [Design Assessment Workbooks Workflow And RTL Review UI](design-assessment-workbooks-workflow-and-rtl-review-ui.md)

## Question

How does an authorized user resolve each Bare Subject Column to an existing scoreable assessment or create one standalone assessment without breaking validation, ordering, weights, permissions, or atomic import?

## Context

A Bare Subject Column is deliberate. Resolution can link it to an existing scoreable standalone/child assessment or create a standalone assessment with title, maximum obtainable score, and weight defaulting to `0%`. Grouped parents and sub-assessment hierarchy creation remain outside import.

## Resolve

- Define eligible existing assessment choices and prevent linking across tenant, term, classroom subject, or grouped parent score boundaries.
- Define standalone create fields, validation, duplicate-title behavior, display order, and weight warnings.
- Decide when creation occurs relative to final confirmation and score validation.
- Define how newly created assessment ids are bound to planned cell updates inside one atomic operation.
- Define concurrent creation/link conflicts and retry behavior.
- Define permission revalidation and audit records for link versus create actions.
- Define review copy and blocking states for unresolved columns.

## Expected Answer

An import-time resolution contract and transaction sequence for linking or creating standalone assessments, including validation, concurrency, authorization, and rollback behavior.

## Comments

Keep Bare Subject Column resolutions inside the reviewed import plan. Linking must target a currently scoreable assessment belonging to the same term-bound classroom subject. “Create” should collect title, obtainable score, and weight defaulting to `0%`, but defer the database write until final confirmation; create the assessment and apply its planned scores in the same transaction, revalidating all scores against the chosen maximum.

## Resolution

Implemented same-subject scoreable assessment linking and deferred standalone creation with title, positive maximum, and 0% default weight. Created ids are bound to planned score writes within the final serializable transaction.
