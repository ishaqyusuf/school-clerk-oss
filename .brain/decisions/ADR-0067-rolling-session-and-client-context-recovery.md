# ADR-0067: Rolling sessions and browser workspace recovery

Date: 2026-10-05
Status: Implemented; production acceptance pending

## Decision

Remembered Better Auth sessions use a rolling 365-day lifetime with daily renewal, and remembered workspace-selection cookies use the same duration. The dashboard session client rechecks every five minutes and on window focus. Sign-out, password reset revocation, expired/deleted sessions and inactive accounts remain authoritative; old expired sessions are not revived. Browser storage removal or more than a year without renewal still requires login.

Browser tRPC context reads use the existing same-origin `/api/profile` HTTP route instead of invoking a server action during initial React rendering. The route returns 401 for missing identity and private/no-store responses for valid context. The classroom page dehydrates its completed server prefetch before rendering the client table. Server data reads retain their separate authenticated transport.

Protected sidebar layout redirects to login before resolving workspace context when the session is absent. The authenticated shell also redirects when a completed session read confirms sign-out/expiry, preserving the requested path. Network errors do not establish expiry. Browser tRPC requests redirect on profile 401.

## Evidence and rollout

Production classroom logs showed `Server Functions cannot be called during initial render`. Local browser verification now loads classroom records and academic navigation without console errors. Navigation tests: 23 passed. Auth typechecking is blocked by an existing `student-admission-type.ts` inferred-never error; broad validation remains separate.

Production Daarul Hadith lacks module configuration, independently causing hidden navigation and denied classroom access. Module grants require the owner's rollout choice; this session change does not invent entitlements. A requested recovery to the older working deployment was rejected by Vercel's Hobby rollback-depth restriction.
