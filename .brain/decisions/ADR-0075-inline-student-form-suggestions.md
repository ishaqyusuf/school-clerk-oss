# ADR-0075: Inline student form suggestions

Date: 2026-10-11
Status: Accepted design; implementation awaiting application QA and release

## Decision

Implement workshop 01 in the existing student registration sheet. Group all name fields above an inline shared-shadcn suggestion list. Search defaults enabled through a checkbox; collapse is an independent presentation state. Unchecking disables actual suggestion queries rather than merely hiding results.

Use a dedicated authenticated read endpoint and DB query so matching every supplied name field ranks before pagination, and enrolled identities are included. Scope all identity, guardian, academic-session, term and class reads to the active tenant. Represent pending/ambiguous placements explicitly and do not offer class editing for them. Reuse existing authorized enrollment and class-change mutations; no schema, finance reconciliation policy, history linkage, or permission expansion.

Use temporary nested Dialog state for View record and Edit class to preserve the registration draft and its URL-owned create sheet. Keep network logic in focused tRPC/TanStack hooks, the API router thin, profile/login checks in the API adapter, and Prisma query/ranking in `packages/db`. This follows Midday customer-create-sheet/customer-form and customer-router/DB-query ownership while adapting to School Clerk's existing form context and domain transactions.

## Consequences

The layout stays familiar and fits narrow sheets, at the cost of vertical growth when more matches are loaded. Search reads counts in three mutually exclusive buckets and fetches bounded pages; no fuzzy/typo search, historical class, or directory-table redesign is added. Offset pagination can shift during concurrent edits; client IDs are de-duplicated. Existing enrollment and class-change transaction guards remain authoritative. See the feature and implementation plan for verification and release limitations.
