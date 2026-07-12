# Prototype Minimal Proxy Pair

Labels: `wayfinder:prototype`
Status: Open
Blocked by: `002-proxy-responsibility-boundary.md`, `003-tenant-url-config-contract.md`, `004-auth-session-scope.md`
Blocks: `007-rollout-and-compatibility.md`

## Question

What is the smallest concrete SchoolClerk proxy shape that matches Halaalvest's structure while preserving the decisions from the URL topology, responsibility boundary, tenant URL config, and auth/session tickets?

Create a rough local prototype or pseudocode artifact only. It should show:

- target `apps/marketing/proxy.ts`
- target `apps/dashboard/src/proxy.ts`
- target `getDashboardTenantUrlConfig()`
- any helper extraction needed to keep the dashboard proxy readable

The resolution should link the prototype artifact and call out unresolved implementation risks.

