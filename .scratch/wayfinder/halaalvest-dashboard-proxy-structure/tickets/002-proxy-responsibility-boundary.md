# Decide Proxy Responsibility Boundary

Labels: `wayfinder:research`
Status: Open
Blocked by: `001-url-topology.md`
Blocks: `005-minimal-proxy-prototype.md`, `006-verification-matrix.md`

## Question

Which responsibilities should remain in SchoolClerk's dashboard proxy after adopting the Halaalvest structure, and which should move into app layouts, server helpers, or shared tenant-url utilities?

Compare the active SchoolClerk dashboard proxy with Halaalvest's dashboard proxy and classify each responsibility:

- host and tenant slug resolution
- custom-domain lookup
- tenant header injection
- stale spoofed header cleanup
- public/protected path detection
- login redirects and return parameters
- Better Auth session checks
- tenant workspace cookie recovery
- path-style local rewrites
- app-root signup redirect
- special `app` subdomain handling

The resolution should produce a responsibility table and a recommended target boundary.

