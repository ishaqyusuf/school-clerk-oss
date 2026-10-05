# QA email and data cleanup

- Development quick-login is enabled for existing active users of the current
  school only in a development runtime using the local database profile, a
  loopback PostgreSQL URL, and a loopback request host. Explicit
  `SCHOOL_CLERK_ENABLE_DEV_QUICK_LOGIN=false` disables it. List, action and
  direct endpoint recheck school/account/user eligibility; no account is
  classified or adopted by this path. Teacher and admin sign-in were verified
  in the Daarul Hadith local browser QA. See ADR-0034. Password prefill from
  URL query parameters remains removed.

- SchoolClerk email boundaries in auth, enrollment, notifications, signup, staff
  invitations, and jobs use one hybrid per-recipient route contract.
- Ordinary recipients are console-only outside production and live in
  production. Mapped `.test` recipients always use provider delivery; unmapped
  `.test` recipients fail closed.
- `SaasAccount` is the explicit QA root and covers all owned schools. New
  accounts are server-classified from the owner email, legacy candidates need
  explicit platform-admin adoption, and QA/live identity lanes cannot mix.
- `/platform/qa-maintenance` previews database/file counts and live custom-domain
  blockers, then uses a signed preview and exact confirmation to start Trigger.
- Cleanup revokes sessions, deletes Vercel Blob assets before database records,
  deletes account-owned schools and orphan users, supports partial retry, and
  retains counts-only receipts.
