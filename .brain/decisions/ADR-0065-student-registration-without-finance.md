# ADR-0065: Student registration when Finance is disabled

- Date: 2026-10-05
- Status: Implemented and verified locally
- Updates: ADR-0049 and ADR-0047 for non-Finance schools

Daarul Hadith enables Student Management, Academics and Attendance but has no Finance entitlement. Reusing the student form from attendance revealed that its unconditional Finance requirement prevents ordinary classroom registration.

Admin/Registrar registration and existing-student enrollment continue requiring live Student Management and Academics access, school/session/classroom/term ownership and open terms. When live effective Finance access is disabled, registration/enrollment must skip automatic fee application and reject all submitted optional-fee/payment entries. The frontend hides fee controls and does not request a fee preview for this case. When Finance is enabled, the existing preview, fee assignment and payment guards remain in force. Unconfigured or invalid module policy remains unavailable.

This does not enable modules, expand entitlements, change financial records or introduce a database schema change. Module configuration is rechecked inside the registration/enrollment transaction; client policy is only a display/readiness gate.

## Validation

Six focused registration-policy tests cover no-Finance success, rejected fees/payments, retained Finance-enabled preview validation, missing Academics denial and unconfigured policy denial. 35 combined focused tests pass. Authenticated Daarul Hadith administrator QA passed student creation and existing-student enrollment without Finance, with immediate attendance refresh. No financial records or module settings changed.
