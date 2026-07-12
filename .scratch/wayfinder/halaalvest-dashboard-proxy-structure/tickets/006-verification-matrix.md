# Define Verification Matrix

Labels: `wayfinder:research`
Status: Open
Blocked by: `002-proxy-responsibility-boundary.md`, `003-tenant-url-config-contract.md`, `004-auth-session-scope.md`
Blocks: `007-rollout-and-compatibility.md`

## Question

What exact automated and manual checks prove the migration did not break tenant routing, auth, and local development?

Define a verification matrix covering:

- local Portless tenant dashboard hosts
- local marketing-proxied dashboard hosts
- localhost and LAN path-style URLs
- production dashboard host format
- custom domains
- unauthenticated protected routes
- authenticated `/` and `/login` redirects
- public auth routes
- public share routes
- tenant workspace cookie recovery
- signup/onboarding dashboard links

The resolution should specify the narrowest unit tests, integration tests, and browser smoke routes required before implementation can be trusted.

