# Decide Auth And Session Scope Preservation

Labels: `wayfinder:research`
Status: Open
Blocked by: `002-proxy-responsibility-boundary.md`
Blocks: `005-minimal-proxy-prototype.md`, `006-verification-matrix.md`

## Question

How should SchoolClerk preserve tenant auth behavior while moving toward Halaalvest's dashboard proxy structure?

Investigate:

- Better Auth trusted origins for local tenant subdomains
- tenant workspace cookie naming and recovery
- `x-forwarded-host` handling from the marketing proxy
- login, signout, reset-password, verify-email, and dev quick-login flows
- staff/teacher/accountant role redirects from `/` and `/login`
- public share routes such as student report and assessment recording

The resolution should state the auth invariants that the migration must preserve and identify the narrowest seam for tests.

