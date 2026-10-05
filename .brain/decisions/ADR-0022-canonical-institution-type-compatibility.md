# ADR-0022: Canonical Institution Types With Legacy Storage Compatibility

- Status: accepted for implementation; validation deferred
- Date: 2026-09-07

## Decision
Use a shared strict institution enum for new configuration writes. Retain the eight ADR-0002 categories plus K12, which already represents combined primary/secondary institutions in signup and the website registry. Do not silently reclassify K12 as PRIMARY or SECONDARY.

Keep the existing nullable `SchoolProfile.institutionType` String column during this compatibility stage. Read normalization accepts canonical values and unambiguous legacy aliases; unknown values are reported as unclassified rather than silently rewritten. A database enum conversion requires an explicit legacy-data inventory and conversion plan; it is not needed for the strict application contract.

Database-owned helpers persist identity; authorized school admins may update only an institution in their account. Separate configured-platform-admin API procedures can target another institution explicitly. Changing classification does not enable unreleased onboarding, purchase add-ons, or rewrite academic/finance records.

## Consequences
Existing tenants remain readable without schema changes or bulk data writes. Client/server consumers share a canonical contract. The database still allows legacy writers until they are migrated; CORE-002/003 must use the strict write schema and must not treat classification as permission or subscription entitlement.
