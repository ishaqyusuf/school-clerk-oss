# Bug: Database Sync Preview Env TypeScript Build Failure

## Date

2026-08-03

## Problem

The `@school-clerk/db` build failed in Vercel and locally with `TS2322` in
`packages/db/src/local-sync.ts` because the preview environment merge assigned a
possibly missing value to a required string property.

## Root Cause

`loadModeEnv()` returns `Record<string, string>`, while indexed access to
`previewEnv.DATABASE_URL` is typed as `string | undefined` under
`noUncheckedIndexedAccess`. The preview branch assigned that value directly to
the explicit `DATABASE_URL` property.

## Fix

Default the missing preview `DATABASE_URL` to an empty string when merging the
environment maps. This preserves the existing fail-closed behavior: preview
never inherits the local database URL, and the existing option validation still
reports a missing preview URL.

## Prevention

Keep explicit environment-profile overrides compatible with their declared map
types, and run the owning package build after changing database sync environment
resolution.

## Related Files

- `packages/db/src/local-sync.ts`
- `.brain/bugs/2026-08-03-database-sync-preview-env-typescript-build-failure.md`

## Verification

- `bun run build` from `packages/db`
- `bun test src/local-sync.pair.test.ts` from `packages/db`
