# Global search

Status: implementation written; all verification deferred (2026-09-08).

## Behavior and ownership

The dashboard command panel searches permitted local pages/quick actions and, after two characters, students, staff and classrooms. Search schemas bound query length to 100 and record limits to 1–20 (panel requests 10). Existing fuzzy SQL takes up to eight candidates per enabled category before final ranking/limit. No network writes or automatic navigation occur.

`search.scope` validates live stored session/user/account/school and optional academic-session ancestry, returning explicit cache identity, role, effective modules, category policy and a server-computed policy signature. `search.global` repeats these checks, rejecting a stale signature with CONFLICT before SQL. Supplied school/user/login/academic IDs must agree with authenticated context and stored ownership; they do not replace the bearer. Scope and records share a RepeatableRead transaction for each record request.

| Category | Role | Required module |
| --- | --- | --- |
| Students | Admin, Registrar | Student Management |
| Staff | Admin, Teacher, HR | Staff Management |
| Classrooms | Admin | Academics |
| Classroom student counts/student-tab link | Admin | Academics and Student Management |

SQL lives in `packages/db/src/global-search.ts`; active context in `search-context.ts`; pure policy in `packages/utils/src/search-policy.ts`; API services map DTOs and errors, with a thin schema-bound router. School/session/classroom/student-form ancestry is constrained and classroom counts are distinct. Missing/invalid configuration fails closed for domain records; local module-independent recovery navigation may remain available through the navigation resolver.

## Client and responsiveness

`use-global-search.ts` owns authoritative scope, separate query keys, conflict refresh and mounted/focus refresh. It withholds stale/refetch/error/paused/placeholder results and immediately collects unused caches. Local catalog results receive authoritative role/effective modules. The panel renders loading/errors without false empty-result claims, offers explicit retry/reload guidance and a close action, and caps height to the dynamic viewport with scrolling. Touch targets are at least 44px; secondary group labels hide on narrow screens. These are source-level layout provisions, not verified device outcomes.

## Deferred verification

Check scope forgery and user/school/login/academic switches; module revocation and configuration changes; every role/category; inaccessible counts; invalid/archived ancestry; ranking; offline/error/conflict/refetch; and 320/375/768px keyboard/browser/mobile flows. No tests, typechecks, builds, lint or live operations ran for this slice. Other destination-route permissions and remaining mixed-domain/aggregate enforcement must still be audited. [ADR-0044](../decisions/ADR-0044-global-search-scope-and-module-policy.md).
