# 01 - Student import non-JSON error handling

**What to build:** When student import verification or execution receives an HTML/non-JSON production response, the import modal should show a clear operator-facing recovery error instead of the raw `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` message.

The staged import review should remain intact so the operator can retry, cancel, or continue resolving rows after the underlying service recovers. The error should include safe diagnostic context for developers without exposing tokens or private data.

**Blocked by:** None - can start immediately.

**Status:** completed

- [x] Verification failures caused by non-JSON or HTML responses show a friendly `Import needs attention` message, not the raw JSON parse error.
- [x] Execution failures caused by non-JSON or HTML responses show a friendly `Import needs attention` message, not the raw JSON parse error.
- [x] The modal keeps the pasted rows, row decisions, checked rows, manual gender choices, and match selections intact after this failure.
- [x] The user can retry verification or execution after the failure without restarting the import.
- [x] The user can cancel the import after the failure.
- [x] Developer-facing diagnostics include the operation name, HTTP status when available, content type when available, and a short safe response preview.
- [x] Diagnostics do not expose auth tokens, full HTML pages, student payloads, or private student data.
- [x] Existing successful verification and execution behavior is unchanged.
- [x] Focused verification covers non-JSON verification failure, non-JSON execution failure, ordinary tRPC error failure, and successful retry after failure.

## Implementation Notes

- Added `import-errors.ts` with safe HTML/non-JSON detection, diagnostic extraction, redaction, and ordinary tRPC error passthrough.
- The import review keeps the last successful verification report after a failed retry so staged rows are not blanked by a transient transport failure.
- Covered by `import-errors.test.ts`, existing parser coverage, and dashboard typecheck.
