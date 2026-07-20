# ADR-0014: Tenant-Wide Student Name Format

## Status

Accepted — 2026-07-19

## Context

SchoolClerk previously assembled student names in different orders across dashboard, API, finance, reports, AI, enrollment, and PDF code. That produced inconsistent presentation and made a school-specific naming convention impossible to enforce globally.

## Decision

Store one `StudentNameFormat` enum on `SchoolProfile`, defaulting to `FIRST_SURNAME_OTHER`. Resolve it only from authenticated tenant context and format names through the shared `@school-clerk/utils/student-name` utility.

The supported values are deliberately finite:

- `FIRST_SURNAME_OTHER`
- `SURNAME_FIRST_OTHER`
- `FIRST_OTHER_SURNAME`

The preference changes display, search keys, and display-name sorting. It does not rewrite stored student identity fields or change duplicate identity rules.

The dashboard exposes the preference in a Midday-style General settings card with explicit save semantics. The website builder remains outside the constrained settings column because it is a full-width editing workspace.

## Consequences

- Schools receive consistent name presentation across authorized product surfaces.
- Existing schools retain the former first-name-first behavior through the database and utility defaults.
- New display consumers must use the shared formatter instead of joining name fields locally.
- API, server actions, public documents, and AI tools must receive the tenant-resolved format; clients cannot select another tenant's preference.
- Adding a new ordering requires an enum/schema update, shared utility support, settings copy, and contract/test updates.

## Alternatives Considered

- Per-user format: rejected because school records and official documents need one institutional convention.
- Free-form templates: rejected because arbitrary tokens create validation, localization, and consistency risks.
- Formatting only in the dashboard: rejected because PDFs, emails, AI, API read models, and public admission flows also display student names.
