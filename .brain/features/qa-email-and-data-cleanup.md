# QA email and data cleanup

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
