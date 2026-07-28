# ADR-0018: Term Enrollment Admission Status And Fee Audience

## Status

Accepted — 2026-07-28

## Context

Canonical student creation time cannot determine whether a student is newly
admitted in a particular term. Imports, historical data entry, transfers, and
returning-student registration can all create a new `Students` row without
representing a new admission. Finance also needs to distinguish required versus
optional fees from the population to which a fee applies.

## Decision

Store admission classification on `StudentTermForm` using
`StudentTermAdmissionType`. Store fee population targeting on `FinanceItem`
using `FinanceStudentAudience`. Keep `FinanceItem.collectable` as the separate
required/optional control. Record new charge provenance with
`FinanceChargeAssignmentSource` so reconciliation can distinguish automatic
required assignments, operator-selected optional fees, and manual charges.

All automatic fee assignment and reconciliation evaluates the term form's
classification together with session, term, classroom, and item activity. Paid
or partially paid charges remain immutable through classification changes;
only unpaid no-longer-applicable automatic item-backed charges are cancelled.
Current-term fee-rule changes reconcile affected term forms in bounded batches.

## Consequences

- A student can be new in one term and returning in another without changing
  canonical identity.
- Imports and historical records can remain `UNCLASSIFIED` until an operator
  confirms their status.
- Required entrance fees can target only new admissions without becoming
  optional.
- Reporting and filters use explicit term data rather than `Students.createdAt`.
- Enrollment entry points must deliberately assign a classification, and new
  entry points must follow the same rule.
