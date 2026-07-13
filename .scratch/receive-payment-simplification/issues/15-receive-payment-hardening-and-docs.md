# 15 — Receive Payment Hardening And Docs

**What to build:** Finish the simplified receive-payment rollout with validation polish, permission states, cache invalidation, focused tests, QA, and durable project documentation.

**Blocked by:** 12 — Quick-Create Simple Collections And Descriptions; 13 — School Fee Quick-Create Path; 14 — Advanced Legacy Payment Controls

**Status:** ready-for-agent

- [ ] All simplified-flow validation errors are clear and preserve entered values where possible.
- [ ] Permission-restricted actions are hidden or disabled with useful messages.
- [ ] Successful payments invalidate the right student, finance, account, and receipt data.
- [ ] Receipt actions, student balances, and account/stream balances remain consistent after payment.
- [ ] Broad regression coverage exists for option loading, submit behavior, quick-create, advanced mode, and permissions.
- [ ] Brain docs are updated for feature behavior, API contracts, permissions, and any database/persistence changes.
- [ ] Final QA confirms the simplified flow is ready to become the default receive-payment experience.
