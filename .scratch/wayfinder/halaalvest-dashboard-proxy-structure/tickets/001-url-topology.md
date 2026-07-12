# Decide Target Dashboard URL Topology

Labels: `wayfinder:research`
Status: Open
Blocked by: None
Blocks: `002-proxy-responsibility-boundary.md`, `003-tenant-url-config-contract.md`, `007-rollout-and-compatibility.md`

## Question

What exact local and production dashboard URL topology should SchoolClerk target when migrating toward the Halaalvest proxy structure?

Answer this by comparing SchoolClerk's current documented topology with Halaalvest's:

- SchoolClerk current production: `dashboard.{tenant}.school-clerk.com`
- SchoolClerk current local canonical: `{tenant}.school-clerk-dashboard.localhost`
- SchoolClerk local marketing-proxied possibility: `{tenant}.school-clerk.localhost`
- Halaalvest local and production dashboard root pattern: `{tenant}.{dashboardRootDomain}`

The resolution should decide which host formats are canonical, which are compatibility aliases, and which are intentionally out of scope.

