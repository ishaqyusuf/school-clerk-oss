# Admission Status And Targeted Fees

## Status

Implemented: 2026-07-28; gender targeting extended 2026-08-02

## Purpose

Classify a student's enrollment for each academic term without inferring that
classification from when the canonical student record was created. Use the same
term classification to target required and optional fees safely.

## Domain Rules

- Admission status belongs to `StudentTermForm`, not `Students`.
- Valid states are `UNCLASSIFIED`, `NEW_ADMISSION`, and `RETURNING`.
- Existing term forms default to `UNCLASSIFIED`; creation and import screens
  expose the classification instead of silently treating every new database
  record as a new admission.
- Public enrollment creates `NEW_ADMISSION` term forms.
- Manual enrollment, promotion, rollover, and AI enrollment create
  `RETURNING` term forms.
- Student import persists an explicit batch classification on every durable row
  payload; its safe default is `UNCLASSIFIED`.

## Fee Rules

- `FinanceItem.studentAudience` is independent of `collectable`.
- Audience values are `ALL_STUDENTS`, `NEW_ADMISSIONS_ONLY`, and
  `RETURNING_STUDENTS_ONLY`.
- `FinanceItem.studentGenderAudience` is a second, independent population
  dimension with `ALL_GENDERS`, `MALE_ONLY`, and `FEMALE_ONLY` values.
- `collectable = true` means a matching required fee is assigned
  automatically. `collectable = false` means the fee is optional and must be
  selected explicitly on student creation or already exist as an optional
  charge.
- Applicability is the intersection of tenant, active item, session, term,
  classroom, admission audience, gender audience, and
  required/selected-optional status.
- Admission status changes reconcile required charges immediately. Newly
  applicable charges are created, duplicate active item charges are skipped,
  and no-longer-applicable unpaid item-backed charges are cancelled.
- `FinanceCharge.assignmentSource` distinguishes required automatic charges,
  explicitly selected optional charges, and manual charges. This allows a fee
  changed from required to optional to remove only its unpaid automatic
  assignments while preserving deliberate optional selections.
- Paid and partially paid charges are preserved for audit and accounting.
- Creating or editing a current-term finance item reconciles the term's student
  forms immediately in bounded batches. The school-fee form scopes newly
  created items to the active session and term by default.
- A failed reconciliation batch is retried once. If it still fails, the fee
  remains saved, the mutation returns a partial result with the affected term
  form IDs, and the operator is prompted to save again to retry.
- Creating a fee always creates a new term-scoped structure; only an explicit
  edit ID updates an existing fee, so a reused fee name cannot retarget a prior
  term's structure.

## Operator Experience

- The student directory shows admission status as a column and supports
  URL-backed admission-status filters.
- New-admission and returning analytics are counted from the selected term
  forms. The cards open the corresponding filtered list.
- Management roles can select one or many current-term rows and set their
  admission status from the shared bottom bar.
- Student creation includes an admission-status selector. Matching required
  fees are shown as automatic, while matching optional fees have quick-add
  checkboxes.
- The Add Fee modal configures admission audience and required/optional
  assignment independently and previews the resulting enrollment behavior in
  plain language before save.
- The same modal configures gender independently. Schools create separate male
  and female fee rows when prices differ, while `ALL_GENDERS` preserves the
  normal shared-fee workflow.
- A modal-level gender acts as the default for a batch, while each sub-fee line
  may override it. Because every line persists as its own `FinanceItem`, the
  resulting eligibility rule remains explicit rather than nested.
- Student import includes a batch admission-status selector plus per-row
  overrides and persists each row's effective value.

## Validation

- Shared fee applicability tests cover admission and gender audience
  intersections, required/optional selection, session, term, classroom, and
  school-wide scope.
- Student query tests cover term-scoped admission filters and tenant-scoped
  classification updates.
- A dashboard component test covers all operator-facing admission labels.
- Local and production Prisma schema pushes succeeded on 2026-07-28.
- The additive gender-audience schema push succeeded locally and in production
  on 2026-08-02.
