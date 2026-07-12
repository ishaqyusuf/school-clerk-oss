# Decide Rollout And Compatibility Plan

Labels: `wayfinder:research`
Status: Open
Blocked by: `001-url-topology.md`, `005-minimal-proxy-prototype.md`, `006-verification-matrix.md`
Blocks: None

## Question

What is the safest rollout plan for migrating SchoolClerk to the Halaalvest-style dashboard proxy structure?

Decide:

- whether to migrate in one change or staged slices
- which old local URLs remain supported temporarily
- whether any old production dashboard URLs require redirects
- what Brain docs and ADR updates are required
- what feature flags or env aliases are useful during transition
- what commands must pass before the migration is considered ready for implementation

The resolution should be an implementation-ready sequence of steps with rollback notes.

