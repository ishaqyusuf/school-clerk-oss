# Academic Data Direction

## Status

Implemented: 2026-07-18

## Overview

SchoolClerk can resolve a tenant's academic data direction independently from the dashboard interface language. The dashboard shell and English application chrome remain left-to-right, while selected academic data surfaces can render right-to-left when the school's names, classes, departments, subjects, school name, or language of instruction provide stronger RTL evidence.

This feature is intentionally not application localization. A future Arabic-language feature owns global document direction, translated labels, navigation mirroring, tabs, dialogs, and complete application RTL behavior.

## Direction Modes

`SchoolProfile.academicDataDirectionMode` uses `AcademicDataDirectionMode`:

- `AUTO`: analyze bounded tenant-scoped academic data and use the weighted result.
- `LTR`: force academic data surfaces to LTR.
- `RTL`: force academic data surfaces to RTL.

Existing and new schools default to `AUTO`; no manual backfill is required.

## Automatic Detection

- Sources: up to 500 active students, 200 classrooms, 200 classroom departments, 200 subjects, the school name, and language of instruction.
- Weights: student names `3`, classrooms/departments/subjects `2`, school name `1`, and language of instruction `4`.
- Recognized scripts include Arabic-family scripts, Hebrew, Syriac, Thaana, NKo, Samaritan, Mandaic, Hanifi Rohingya, and Adlam.
- Empty, numeric-only, and neutral values do not contribute evidence.
- Missing evidence, equal weighted evidence, and detector failures resolve safely to LTR.
- Automatic analysis is cached per tenant for five minutes. Forced LTR/RTL modes bypass cached analysis and apply immediately.

## UI Scope

The `AcademicDataDirectionProvider` is mounted inside the authenticated dashboard layout without changing `<html dir="ltr">` or the global Radix direction. Academic tables, cards, rosters, attendance, assessment recording, report tables, and academic identity content consume the resolved direction.

Within these surfaces:

- Names, classes, subjects, and free-text remarks use `dir="auto"`.
- English headers, actions, filters, dates, codes, scores, phone numbers, and currency remain LTR.
- Sticky identity columns, dividers, horizontal scroll controls, column flow, and card alignment use logical direction-aware positioning.
- English toolbars surrounding academic tables remain LTR.
- Existing per-report LTR/RTL cookies override the school academic direction for that report.

Finance, inventory, search, global navigation, settings chrome, dialogs, tabs, and other application UI remain LTR.

## Settings And Authorization

School Profile contains an `Academic Data Direction` card that shows configured mode, resolved direction, and a bounded detection summary. Authenticated tenant users may read the result. Only `ADMIN` and `Admin` roles may persist `AUTO`, `LTR`, or `RTL`.

All reads and writes derive `schoolProfileId` from authenticated tenant context. The update mutation uses a tenant-constrained write and cannot accept a school id from the client.

## Key Files

| File | Purpose |
| --- | --- |
| `packages/db/src/academic-data-direction.ts` | Script detection, weighted analysis, tenant sampling, fallback, and mode resolution |
| `apps/api/src/db/queries/school-settings.ts` | Tenant-scoped read/update helpers |
| `apps/api/src/trpc/routers/school-settings.routes.ts` | Public tRPC settings contract |
| `apps/dashboard/src/lib/academic-data-direction/server.ts` | Five-minute cached server resolver |
| `apps/dashboard/src/components/academic-data-direction/provider.tsx` | Scoped dashboard context and academic surface wrapper |
| `apps/dashboard/src/components/academic-data-direction/settings-card.tsx` | School Profile status and override controls |

## Verification

- Detector and API tests cover Arabic, Persian/Urdu, Hebrew, Latin, mixed-script, numeric-only, empty/tied evidence, forced modes, failure fallback, administrator enforcement, and tenant isolation.
- Database, API, dashboard, and shared UI TypeScript checks pass.
- Prisma Client generation and local/production schema synchronization completed. Local migration creation stopped on pre-existing drift and no destructive reset was run. The remote-development push was attempted but the configured transaction pooler did not return.

