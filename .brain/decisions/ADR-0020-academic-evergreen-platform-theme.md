# ADR-0020: Academic Evergreen Platform Theme

## Status

Accepted — 2026-08-03

## Context

SchoolClerk's platform-owned surfaces used a neutral theme without one durable
visual identity, while the marketing page did not explain the connected product
clearly enough. The platform needs colors and typography that feel credible for
school operations, work across marketing and application UI, and remain
separate from the configurable themes used by tenant-owned school websites.

## Decision

Adopt Academic Evergreen as the default semantic theme for the marketing app,
dashboard app, and shared UI package:

- warm ivory `#faf8f2` for the main light background;
- dark evergreen `#102820` for text and deep product surfaces;
- academic green `#146b4a` for primary actions;
- pale green `#e2f2e9` for accent surfaces;
- restrained gold `#d9a533` for highlights and chart accents;
- deep evergreen `#0e1d18` and bright green `#68c79b` for dark mode.

Keep these values behind existing semantic CSS variables so component APIs do
not depend on raw brand colors. Use Instrument Sans for platform interface copy
and Fraunces only for large editorial marketing headings.

Tenant school-site templates continue to resolve colors from each website's
theme configuration. The platform palette must not replace tenant-owned public
website themes.

## Consequences

- Marketing, dashboard, and shared components have one recognizable default
  palette without introducing a new component abstraction.
- Existing semantic classes inherit the rebrand with limited code churn.
- Marketing can use expressive serif typography while application interfaces
  remain compact and legible.
- Future color changes should update semantic tokens in all three platform
  owners together and preserve tenant website theme isolation.
