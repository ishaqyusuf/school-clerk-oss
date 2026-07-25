# ADR-0013: Reuse The Active Shared Portless Proxy

- Status: accepted
- Date: 2026-07-22

## Context

Multiple local projects share one Portless proxy. School Clerk dev scripts pinned `PORTLESS_PORT=443`, which caused startup failures whenever the already-running shared proxy used another configured port. Proxy lifecycle and TLS settings are global Portless concerns rather than per-workspace app concerns.

## Decision

- School Clerk workspace dev scripts do not set `PORTLESS_PORT` or `PORTLESS_HTTPS`.
- App scripts retain their app ports, app names, and wildcard routing configuration.
- Developers and agents reuse the active shared HTTPS proxy and use the URLs Portless reports.
- Runtime URL generation preserves the active proxy port from the current Portless host when building cross-app local URLs.
- A project dev command does not stop or restart the shared proxy merely to impose a different proxy port.

## Consequences

- School Clerk can run alongside Plotkeys, Afterservice, EwaTrade, and Halaalvest on one shared proxy.
- The displayed local URL may include the proxy's selected port when the global proxy is not on the standard HTTPS port.
- Dev scripts no longer depend on `SCHOOL_CLERK_PORTLESS_PROXY_PORT`.

## Supersedes

- Supersedes the port-443 and port-free URL requirements in ADR-0008 while preserving its cmux process-ownership rules.
