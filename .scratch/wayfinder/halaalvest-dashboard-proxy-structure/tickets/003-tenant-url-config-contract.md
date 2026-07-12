# Decide Tenant URL Config Contract

Labels: `wayfinder:research`
Status: Open
Blocked by: `001-url-topology.md`
Blocks: `005-minimal-proxy-prototype.md`, `006-verification-matrix.md`

## Question

Should `@school-clerk/tenant-url` and `getDashboardTenantUrlConfig()` migrate to the Halaalvest contract, stay as a richer SchoolClerk superset, or split into a small Halaalvest-style core plus SchoolClerk-specific extensions?

Investigate differences around:

- `DASHBOARD_ROOT_DOMAIN`, `LOCAL_ROOT_DOMAIN`, `APP_ROOT_DOMAIN`, and SchoolClerk's `resolveDashboardAppRootDomain`
- `additionalRootDomains`
- `urlVariantPathHosts`
- local path-style support
- `dashboard.` prefix stripping
- tenant URL variant switching
- signup and onboarding URL generation

The resolution should choose a contract and list the exact helpers/envs that implementation should keep, rename, deprecate, or remove.

