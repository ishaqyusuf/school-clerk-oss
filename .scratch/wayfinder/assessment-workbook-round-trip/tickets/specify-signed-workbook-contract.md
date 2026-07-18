# Specify Signed Workbook Contract

Labels: `wayfinder:research`
Status: Resolved
Blocked by: [Define Assessment Workbook Package Boundary](define-assessment-workbook-package-boundary.md), [Define Download Builder Contract](define-download-builder-contract.md), [Define Authorization And Workbook Security Model](define-authorization-and-workbook-security-model.md)
Blocks: [Design Import Verification And Conflict Algorithm](design-import-verification-and-conflict-algorithm.md), [Define Verification And Rollout Matrix](define-verification-and-rollout-matrix.md)

## Question

What versioned `.xlsx` structure can preserve a readable boys'/girls' classroom assessment form while carrying enough signed identity and download-snapshot data for deterministic round-trip import?

## Context

The visible layout should reflect the supplied Arabic workbook: classroom title bands, two-level subject/assessment headers, Bare Subject Columns, and gender sections. Matching must use hidden stable identifiers, not labels. Existing scores and original values are required for change and conflict detection.

## Resolve

- Define visible sheet names, title/meta rows, subject groups, assessment subheaders, roster rows, styling, widths, freezing, protections, and LTR/RTL column flow.
- Define hidden metadata sheets/ranges for schema version, tenant, term, classroom, direction, generation time, students, columns, original values, and signature.
- Define stable column and row identifiers that survive visible label edits and safe row/column movement rules.
- Decide whether structural edits are rejected or selectively tolerated.
- Define how Bare Subject Columns are represented without an assessment id.
- Define formula, macro, external-link, hidden-sheet, and unknown-content policies.
- Define forward/backward compatibility and unsupported-version behavior.
- Verify the proposed contract in major spreadsheet applications selected by the compatibility decision.

## Expected Answer

A versioned workbook schema with visible and hidden layouts, signed canonical payload, structural invariants, compatibility policy, and representative LTR/RTL examples.

## Comments

Use one protected visible classroom sheet and one hidden metadata sheet. Sign a canonical payload containing schema version, tenant/term/classroom identity, row and column mappings, original score snapshot, generation time, and structural coordinates—but exclude editable uploaded score values. Allow edits only in score cells; reject row/column movement or structural changes in the first version. A hidden sheet is discoverable, so authenticity must rely entirely on signature verification.

## Resolution

Version 1 uses protected `Assessment Form` plus `veryHidden` `__school_clerk`, hidden stable column/student keys, boys/girls sections, two-level headers, existing values, RTL/LTR worksheet views, and signed metadata containing all immutable identity, coordinates, and original scores.
