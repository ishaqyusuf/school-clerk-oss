# Define Score Normalization And Validation Contract

Labels: `wayfinder:research`
Status: Resolved
Blocked by: None
Blocks: [Design Import Verification And Conflict Algorithm](design-import-verification-and-conflict-algorithm.md), [Define Verification And Rollout Matrix](define-verification-and-rollout-matrix.md)

## Question

What deterministic normalization and validation rules turn workbook score cells into safe assessment updates without treating blanks as missing errors or using AI?

## Context

Blank cells are accepted and mean no change. Literal Western, Arabic-Indic, and Eastern Arabic-Indic digits plus `.` and `٫` decimal separators are accepted. Formulas, percentages, words, macros, invalid nonblank values, and scores outside the current assessment maximum must not be written.

## Resolve

- Define Unicode digit and decimal normalization precisely.
- Decide whitespace, sign, leading-zero, exponent, thousands-separator, negative-zero, and locale edge cases.
- Define decimal precision and database comparison behavior for `Float` score fields.
- Define blank, unchanged, new, changed, invalid, above-maximum, and below-minimum cell classifications.
- Define whether current or downloaded obtainable limits govern validation when assessment configuration changed.
- Define duplicate cells/rows, merged cells, hidden rows/columns, and Excel error-value behavior.
- Provide a shared pure-function contract and exhaustive test vectors.

## Expected Answer

A normative score-cell parsing and validation specification with classifications, numeric semantics, error codes/messages, and table-driven tests.

## Comments

Implement score parsing as a pure function that trims Unicode whitespace, maps Western/Arabic-Indic/Eastern Arabic-Indic digits, converts `٫` to `.`, and accepts one finite nonnegative decimal literal. Reject signs below zero, exponent notation, grouping separators, percentages, formulas, words, infinities, and spreadsheet error values. Blank cells return `blank/no-change`; nonblank values validate against the assessment’s current obtainable score and receive stable classification/error codes.

## Resolution

Implemented and table-tested the pure normalization/classification contract. Blanks are no-ops; supported digit families and decimal separators normalize to finite nonnegative numbers; all unsupported literal formats and above-current-maximum values block apply.
