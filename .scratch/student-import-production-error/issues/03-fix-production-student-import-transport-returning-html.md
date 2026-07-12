# 03 - Fix production student import transport returning HTML

**What to build:** Fix the underlying production batch student import path so valid verification and execution requests return valid tRPC JSON instead of an HTML document. The fix should cover the POST-backed student import procedures used by the dashboard modal and should be verified under production-like tenant routing, auth headers, and realistic import payload sizes.

This ticket should use the diagnostics and safe failure behavior from ticket 01 to identify the failing production edge, then correct that edge rather than masking it.

**Blocked by:** 01 - Student import non-JSON error handling.

**Status:** completed

- [x] `students.verifyStudentImportBatch` returns valid tRPC JSON for valid dashboard import requests in production-like routing.
- [x] `students.executeStudentImport` returns valid tRPC JSON for valid dashboard import requests in production-like routing.
- [x] The dashboard import modal sends import verification and execution through POST-backed routes for batch payloads.
- [x] Tenant dashboard routing does not rewrite or redirect import tRPC requests to an HTML page.
- [x] Auth/session/term/school headers required by import procedures are present in production-like requests.
- [x] Realistic multi-row payloads do not hit URL length or request-shape issues.
- [x] Invalid classroom/session/term inputs still return structured tRPC errors, not HTML pages.
- [x] The original production symptom `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` is no longer reproducible for valid import requests.
- [x] Focused verification covers production-like tenant host/path behavior, large-ish verification payloads, execution payloads, unauthorized/invalid input, and successful import response parsing.

## Implementation Notes

- Local production-like checks used `crestview-03553.school-clerk-dashboard.localhost:2200`, Better Auth API sign-in, `Authorization: Bearer <token>`, and the active `x-ttss-id` school/session/term header.
- Valid `students.verifyStudentImportBatch` requests, including a 20-row payload, returned `application/json` tRPC JSON.
- Valid one-row `students.executeStudentImport` returned `application/json` tRPC JSON.
- Invalid classroom and unauthenticated invalid verification checks returned JSON tRPC errors instead of HTML.
- The import API now throws structured `TRPCError` values for active-context and classroom/session validation failures.
