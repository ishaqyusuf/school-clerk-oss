# Define Data Integrity Guardrails

Labels: `wayfinder:research`
Status: Open
Blocked by: `003-design-survivor-selection-and-move-rules.md`
Blocks: `007-build-implementation-handoff.md`

## Question

What prevents the same duplicate problem from reappearing after the merge workflow ships?

## Context

Duplicate cleanup is not enough if student import, manual create, class change, or promotion can immediately recreate the same duplicate class/term state.

## Resolve

- Whether import/create/change-class should warn or block exact duplicates in the selected classroom/term.
- Whether promotion/progression flows need the same duplicate guard.
- Whether a database-level partial unique index is feasible for `StudentTermForm` duplicate enrollment prevention.
- How soft-delete semantics affect constraints.
- Transaction locking or retry behavior for concurrent imports/merges.
- Whether existing import verification can reuse the duplicate detector.
- Whether prevention should happen immediately in the first implementation or as a second phase.

## Expected Answer

A prevention strategy with any schema/migration implications and test requirements.

## Approved Comment

After merge support exists, import, manual create, class change, and promotion/progression flows should reuse the duplicate detector. Exact duplicates in the same classroom/term should at minimum warn and require explicit resolution; high-risk flows like import should guide the operator to keep/update an existing match instead of creating a new student. A DB constraint may be useful for duplicate term enrollment by same student, but name-based duplicate prevention likely belongs in service logic because legitimate same-name students can exist once separated by `otherName`. Concurrency should be handled with transaction checks immediately before merge execution.
