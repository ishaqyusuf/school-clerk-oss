# 05 - Polish Execution And Completion States

**What to build:** The execution step should feel calm and trustworthy while the system imports students. Operators should see progress, outcome counts, classroom impact, failed-row analysis, and clear next actions after completion.

**Blocked by:** 03 - Create Review Command Center; 04 - Redesign Import Row Cards

**Status:** done

- [x] During execution, setup and review controls are hidden or disabled so the operator focuses on import status.
- [x] Import progress uses a standard progress/status presentation with clear "working", "success", "partial", and "needs attention" states.
- [x] Outcome metrics show created students, term sheets created, kept matches, updated names, skipped rows, and failed rows.
- [x] Classroom breakdown remains visible in execution results when rows span more than one classroom.
- [x] Failed rows are listed with line numbers and readable failure reasons that help the operator decide what to fix next.
- [x] Successful completion exposes clear "Start new import" and "Close" actions.
- [x] Partial completion preserves enough context for operators to understand which rows succeeded and which need another pass.
- [x] Transport/non-JSON errors continue to show safe diagnostics without exposing private payloads, tokens, or full HTML responses.
- [x] Current execution payload semantics, skipped-row counting, completion result interpretation, and query invalidation behavior remain unchanged.
