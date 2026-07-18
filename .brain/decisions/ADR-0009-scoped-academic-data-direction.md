# ADR-0009: Scoped Academic Data Direction

- Status: accepted
- Date: 2026-07-18

## Context

Some schools operate an English dashboard while their academic records are predominantly Arabic, Persian, Urdu, Hebrew, or another RTL script. Globally setting the dashboard document to RTL would mirror English navigation, tabs, controls, dialogs, and settings before full localization exists. Leaving every academic surface LTR makes RTL rosters, names, classes, subjects, assessments, and reports difficult to scan.

The direction decision must be tenant-scoped, safe when evidence is incomplete, reversible by an administrator, and reusable across server and client academic surfaces.

## Decision

Separate academic data direction from application language and document direction.

- Store `AcademicDataDirectionMode = AUTO | LTR | RTL` on `SchoolProfile`, defaulting to `AUTO`.
- In automatic mode, analyze bounded tenant-scoped samples of active academic names plus school language metadata, using weighted first-strong-character detection.
- Resolve missing, tied, or failed detection to LTR.
- Cache automatic analysis for five minutes per tenant while reading forced modes without that cache.
- Mount a scoped React provider inside the authenticated dashboard shell. Do not mutate `<html dir>`, global Radix direction, or global CSS direction.
- Apply direction only to academic data containers and use logical positioning for sticky columns, dividers, and scrolling.
- Mark mixed-language record content with `dir="auto"` and explicitly preserve English controls and machine-readable values as LTR.
- Keep report direction cookies as the highest-priority per-report override.
- Derive tenant scope from authenticated context for both reading and updating the setting; allow only administrator roles to update it.

## Consequences

### Positive

- RTL academic records become naturally scannable without destabilizing the English dashboard.
- Existing schools receive a safe automatic default with no backfill.
- Administrators can correct ambiguous data with a persistent override.
- The provider and public types give future academic surfaces one consistent integration point.
- Full Arabic localization can later own application-wide direction without coupling to this detector.

### Tradeoffs

- Academic surfaces must opt in and preserve the distinction between data content and surrounding English controls.
- Cached automatic analysis can take up to five minutes to reflect newly changed academic data.
- Script majority is a presentation heuristic, not a language classifier; mixed schools may need the manual override.
- Table primitives require direction-aware logical edges and RTL scroll normalization.

## Alternatives Considered

- Set the global document direction from detected student names.
- Tie RTL exclusively to the future application-language selector.
- Require every school to choose LTR or RTL manually.
- Use browser `dir="auto"` on whole pages without a tenant-level resolved mode.

## Follow-up Actions

- When Arabic localization ships, make global application direction an explicit language concern while retaining academic direction as an optional data-level override where useful.
- Add new academic surfaces to the scoped provider contract as they are introduced.
- Consider explicit cache invalidation after large imports if five-minute convergence becomes noticeable.

