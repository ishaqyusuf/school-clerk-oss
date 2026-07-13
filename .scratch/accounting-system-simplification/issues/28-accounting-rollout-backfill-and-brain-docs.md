# 28 — Accounting Rollout, Backfill, And Brain Docs

**What to build:** Prepare the accounting system for rollout by interpreting existing records safely, validating compatibility, completing QA, and updating durable project documentation.

**Blocked by:** 27 — Accounting Reports, Reconciliation, And Permissions

**Status:** done

- [x] Existing finance records are interpreted or backfilled into the term-ledger/account model without casually rewriting history.
- [x] Existing student fees, payments, charges, transfers, settlements, reconciliation, receipts, and account views remain compatible.
- [x] Rollout notes describe phased enablement and any feature flags or migration steps.
- [x] Final QA covers term ledger, accounts, transfers, money-in attribution, money-out, close/carry-forward, payroll, purchases, product/project accounts, reports, and permissions.
- [x] Brain docs are updated for finance operations, student fees, API contracts, permissions, database schema/relationships, migrations, and durable architecture decisions where applicable.
- [x] Release handoff states known limitations, out-of-scope inventory behavior, and follow-up work.

Note: historical rows are preserved and interpreted through collected-in fallback rules. No destructive history rewrite or broad data backfill was performed.
