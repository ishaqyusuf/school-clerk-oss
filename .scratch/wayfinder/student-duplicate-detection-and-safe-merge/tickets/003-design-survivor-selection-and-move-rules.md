# Design Survivor Selection And Move Rules

Labels: `wayfinder:grilling`
Status: Open
Blocked by: `002-inventory-merge-owned-records.md`
Blocks: `004-design-detection-and-merge-api-contract.md`, `006-define-data-integrity-guardrails.md`

## Question

When duplicate copies exist, how should the system choose the survivor and move current-term data without damaging historical data?

## Context

The desired behavior is: if one copy owns history and another copy owns the current term sheet, move the current record to the historical copy rather than deleting the historical copy. The system should help the operator avoid choosing the wrong record.

## Resolve

- Survivor scoring:
  - historical record count
  - current-term ownership
  - finance activity
  - assessment activity
  - attendance activity
  - guardian links
  - older creation date
- What counts as "history" versus "current record" for a session/term.
- If one copy has history and another has the current term sheet, how current-term references move to the historical survivor.
- Conflict behavior when both copies have current term sheets in the same classroom/term.
- Conflict behavior when both copies have different non-empty records for the same assessment, attendance date, or finance charge.
- Whether the operator can override the recommended survivor and what warnings must appear.

## Expected Answer

A deterministic survivor algorithm and merge conflict rules that can be implemented inside one transaction.

## Approved Comment

The recommended survivor should be the copy with the strongest history score: assessment records, attendance records, finance charges/payments, guardian links, prior session/term forms, and then oldest creation date as tie-breaker. Current-term ownership should not automatically win over history. If one copy owns history and another owns the current term sheet, the current term sheet and related current records should move to the historical survivor. If both copies have conflicting current-term records for the same class/term, the merge should stop and require operator review rather than guessing.
