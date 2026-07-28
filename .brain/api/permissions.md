# QA maintenance permissions

- Only configured platform-admin roles can discover/adopt QA accounts or
  operate purge runs.
- Purging accounts have sessions revoked and cannot use authenticated school
  APIs.

# Student directory permissions

- Every `studentsRouter` operation requires authentication.
- Student reads derive `schoolProfileId` from the authenticated workspace and
  exclude soft-deleted canonical students.
- Term-form detail reads also require the term form and student to belong to the
  active school and be non-deleted.
- Student deletion, term-enrollment deletion, gender changes, class changes,
  and bulk class/term actions require `ADMIN`, `Admin`, or `Registrar`.
- Target classroom departments and selected student term forms are verified
  against the same tenant before a class move is committed.
