# Inventory Merge-Owned Records

Labels: `wayfinder:research`
Status: Open
Blocked by: `001-define-duplicate-identity.md`
Blocks: `003-design-survivor-selection-and-move-rules.md`

## Question

Which database records must move from duplicate student copies to the survivor so no attendance, assessment, finance, guardian, notification, admission, or activity history is lost?

## Context

The merge action must preserve both historical records and current-term records. The current schema has direct `Students` relations and term-sheet-owned relations through `StudentTermForm`.

## Resolve

- Direct `Students` relations:
  - `StudentSessionForm`
  - `StudentTermForm`
  - guardians
  - assessment records
  - finance charges/payments
  - notification contact
- Term-sheet relations:
  - attendance
  - assessment records
  - finance charges
  - student activity
- Legacy finance tables that may still reference `StudentTermForm`, `Students`, or both.
- Admissions/enrollment rows that may store accepted student or accepted term form ids.
- Which relations can be updated safely and which require conflict rules.
- Which models need tests before any merge mutation is trusted.

## Expected Answer

A table of models, foreign keys, merge action, conflict risk, and test expectations.

## Approved Comment

The merge must treat `Students` as the identity record and `StudentTermForm` as the term/class enrollment record. Records that should move to the survivor include `StudentSessionForm`, `StudentTermForm`, guardians, direct student assessment records, finance charges/payments, notification contact, term-form attendance, term-form assessment records, finance charges linked to term forms, student activity, and admission/enrollment accepted ids where present. Every referenced model should be inventoried before implementation, and the merge should update foreign keys inside a transaction. Any duplicate record with historical links should be soft-deleted only after its references have been safely moved or intentionally preserved.
