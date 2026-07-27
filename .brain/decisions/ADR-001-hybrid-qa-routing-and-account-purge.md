# ADR-001: Hybrid QA routing and account purge

## Status

Accepted

## Decision

Replace scattered development recipient overrides with shared per-recipient
hybrid routing. Persist QA classification on `SaasAccount`, require explicit
adoption for legacy candidates, and run file-first purge through Trigger after
a signed preview and typed confirmation. `QaPurgeRun` remains global and
counts-only.

## Consequences

Production QA and ordinary delivery coexist safely, synthetic identity is
preserved, all schools owned by an adopted account share its QA lane, and live
custom domains block destructive cleanup.
