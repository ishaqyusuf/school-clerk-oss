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
  admission-status changes, and bulk class/term actions require `ADMIN`,
  `Admin`, or `Registrar`.
- Target classroom departments and selected student term forms are verified
  against the same tenant before a class move is committed.
- Registrar navigation may expose Enrollment and Student Directory because the
  existing authenticated student-management contract already includes
  `Registrar`. This navigation exposure does not replace or broaden server-side
  checks.
- Student creation remains available through its existing authenticated
  contract, but including a positive `feePayments[]` amount additionally
  requires finance-write access (`ADMIN`, `Admin`, or `Accountant`). The same
  finance check is enforced in the transaction service, not only in the UI.

# Dashboard navigation permissions

- Navigation is a discoverability layer, not an authorization boundary.
- The dashboard resolves module, section, item, and child availability by
  intersecting role, permission, institution-type, enabled-module, and status
  policies.
- Route handlers, server components, tRPC procedures, and database helpers must
  continue enforcing tenant and role authorization independently of whether a
  link is visible.
- Support resolves to header-only Notifications and Student resolves to the
  explicit unavailable page; neither role falls through to an Admin or Teacher
  default.
