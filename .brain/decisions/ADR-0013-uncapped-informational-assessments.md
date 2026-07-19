# ADR-0013: Uncapped Informational Assessments

- Status: Accepted
- Date: 2026-07-19

## Context

Some assessment fields record informational quantities, such as a page number or page count, whose useful values do not share one fixed maximum. Temporary maxima distort these fields, while assigning them a report weight would incorrectly affect subject totals and printed results.

## Decision

- Represent an uncapped assessment with `ClassroomSubjectAssessment.obtainable = null`.
- Allow `null` only for standalone assessments whose `percentageObtainable` is exactly `0`.
- Continue requiring a positive obtainable value for positively weighted standalone assessments and every grouped-assessment child.
- Treat an uncapped score as a finite non-negative numeric value with no upper-bound check.
- Keep uncapped assessments scoreable in authenticated, public-link, AI, and signed-workbook recording paths.
- Exclude them from weighted totals and printed/PDF result columns through their required zero weight.
- Keep the existing signed workbook version because its metadata contract already represents a nullable maximum.
- Treat `null` as one shared assessment configuration, not as a per-student denominator or maximum.

## Consequences

- Assessment/API/workbook contracts expose `obtainable` as `number | null`.
- Score-entry boundaries must distinguish “no maximum” from `0` and must still reject negative, malformed, and non-finite values.
- A future request for per-student denominators requires a separate model and calculation decision.
- Production can receive the backward-compatible nullable schema without converting any assessment data.
