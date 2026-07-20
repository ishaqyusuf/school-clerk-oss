# Student Name Format

## Status

Implemented: 2026-07-19

## Overview

Each school can choose one tenant-wide student display-name order from Settings → General. The preference is persisted on `SchoolProfile.studentNameFormat` and is resolved from authenticated tenant context; callers never supply a school id.

Supported formats:

- `FIRST_SURNAME_OTHER`: first name, surname, other name.
- `SURNAME_FIRST_OTHER`: surname, first name, other name.
- `FIRST_OTHER_SURNAME`: first name, other name, surname.

Existing and missing values safely default to `FIRST_SURNAME_OTHER`. Blank optional parts are omitted without leaving extra spaces.

## Settings Pattern

- Settings uses a Midday-style secondary navigation shell with a centered `max-w-[800px]` content column and explicit card sections.
- General settings are hydrated on the server and rendered as School information, Student name format, and Academic data direction cards.
- Editable cards use controlled forms, explicit Save buttons, pending/dirty states, exact tRPC query invalidation, and a server refresh after success.
- The website builder remains a deliberate full-width exception because it is a visual editing workspace.
- List filters, sheets, bulk actions, and table URL state are intentionally omitted from General settings because the name format is a singleton school preference rather than a record collection.

## Runtime Behavior

- The API resolves the configured format once into the tRPC tenant context.
- The dashboard sidebar layout provides the format to authorized client surfaces.
- Student lists, reports, result recording, promotion, import review, payment/finance surfaces, AI tools, enrollment communications, admission letters, and result PDFs use the shared formatter.
- Raw `name`, `surname`, and `otherName` fields remain unchanged. The preference controls presentation and name-based ordering/search helpers only.

## Authorization

- Any authenticated tenant user may read the setting as part of authorized school data.
- Only `ADMIN` SaaS owners and `Admin` school administrators may change it.
- Reads and writes are constrained to the `schoolProfileId` derived from the authenticated tenant context.

## Key Files

- `packages/db/src/schema/school.prisma`
- `packages/utils/src/student-name.ts`
- `apps/api/src/db/queries/school-settings.ts`
- `apps/api/src/trpc/init.ts`
- `apps/dashboard/src/components/settings/settings-shell.tsx`
- `apps/dashboard/src/components/student-name-format/*`
- `apps/dashboard/src/lib/student-name-format/server.ts`

## Verification

- Shared formatter tests cover all formats, optional name parts, and persisted-value fallback.
- School settings router tests cover reads, tenant-constrained admin updates, and non-admin rejection.
- Assessment-result helper tests cover format-aware roster behavior.
- Affected package typechecks pass.
- Website/browser testing was intentionally skipped at the user's request.
