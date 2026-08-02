# ADR-0019: Finance Item Gender Audience

## Status

Accepted — 2026-08-02

## Context

Some student charges have different products or prices for male and female
students, such as uniforms. Gender is a canonical student attribute, while
admission status belongs to a term enrollment. Treating either dimension as a
fee type or overloading required/optional assignment would make combinations
ambiguous and permit payment paths to bypass eligibility rules.

## Decision

Store gender targeting on `FinanceItem.studentGenderAudience` using
`FinanceStudentGenderAudience`: `ALL_GENDERS`, `MALE_ONLY`, or `FEMALE_ONLY`.
Default existing and omitted values to `ALL_GENDERS`.

Evaluate gender as an orthogonal applicability dimension together with tenant,
item activity, session, term, classroom, `StudentTermForm.admissionType`, and
required/selected-optional assignment. Apply the same rule to previews,
automatic assignment, reconciliation, rollover, payment options, and direct
configured-item payments.

When male and female amounts differ, create two finance items (for example,
Male Uniform and Female Uniform) and target each item to its matching gender.
The Add Fee form may present these as sub-fee lines under one stream/title: a
form-level gender supplies the default, while a line-level override determines
the `studentGenderAudience` saved on that line's resulting item.

## Consequences

- Admission and gender rules can be combined without duplicating enrollment
  semantics.
- Existing fees remain applicable to all students.
- A student's saved gender is the source of truth; operators cannot select an
  ineligible configured fee from student creation or payment workflows.
- Future gender changes must reconcile affected unpaid managed charges in the
  same way admission-status changes do.
