# DB Prisma Client Wildcard Export Turbopack Failure

## Bug ID and Title
- Date discovered: 2026-06-12
- Date resolved: 2026-06-12
- Severity: Medium

## Symptoms
Turbopack reported `unexpected export *` for `[externals]/@prisma/client` while compiling the dashboard App Route that imports the API tRPC handler through `@school-clerk/db`.

## Root Cause
`packages/db/src/index.ts` and the tracked generated `packages/db/src/index.js` re-exported Prisma Client with `export * from "@prisma/client"`. Prisma Client is CommonJS at runtime, so Turbopack cannot statically enumerate wildcard exports from the externalized module.

## Fix Implemented
Replaced the Prisma Client wildcard re-export with explicit named exports for the runtime values and generated types currently consumed through `@school-clerk/db`.

## Prevention
Do not use wildcard re-exports from CommonJS packages in public workspace package entrypoints. For Prisma Client, manually export the required values, enums, and generated types.

## Related Files
- `packages/db/src/index.ts`
- `packages/db/src/index.js`

## Related Tests
- `bun --cwd packages/db typecheck` passed.
- `bun --filter @school-clerk/dashboard build` completed the Turbopack compile successfully, then failed later during page-data collection because `APP_ROOT_DOMAIN` is missing from the production environment.
- `bun --filter @school-clerk/api typecheck` and `bun --filter @school-clerk/dashboard typecheck` still fail on broader pre-existing type errors outside this Prisma export fix.
