# 03 - Create Review Command Center

**What to build:** The review step should give operators a command-center view of the import batch: what is ready, what matched, what needs attention, what is checked, what will be skipped, and how many rows can execute.

**Blocked by:** 01 - Redesign Student Import Workflow Shell; 02 - Rebuild Import Setup Form

**Status:** done

- [x] The review top bar shows fallback classroom controls, refresh, cancel, checked count, skipped count, executable count, and execute action in a clean responsive layout.
- [x] The classroom scope summary is easy to scan and shows per-classroom row, checked, executable, and attention counts.
- [x] Ready, match-found, and needs-attention tabs use consistent shadcn tab styling with counts that update as rows are resolved.
- [x] Empty states for each tab explain the current state in operator-facing terms and do not look like errors.
- [x] Loading verification state uses a polished progress or spinner state that preserves the workflow shell.
- [x] Verification, pre-submit, and execution-blocking errors appear as compact dismissible alerts without clearing the last successful review state.
- [x] Batch selection actions are visually secondary to execution and do not compete with the primary import action.
- [x] Execute remains disabled when attention rows block import or no checked executable rows exist, with visible context explaining why.
- [x] Current batch defaults, checked-row behavior, attention gating, retry behavior, and cache invalidation semantics remain unchanged.
